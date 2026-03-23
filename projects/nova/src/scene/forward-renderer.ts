import { Renderer } from './renderer';
import { Scene } from './scene';
import { GraphicsDevice } from '../graphics';
import { Layer } from './layer';
import { Camera } from './camera';
import { ShadowMapCache } from './shadow-map-cache';
import { WorldClustersAllocator } from './world-clusters-allocator';
import { MeshInstance } from './mesh-instance';
import { Light } from './light';
import { BoundingBox } from '../math';
import { Mat4 } from '../math';

export class ForwardRenderer extends Renderer {
    scene: Scene;
    graphicsDevice: GraphicsDevice;
    layers: Layer[];
    camera: Camera | null;
    shadowMapCache: ShadowMapCache;
    worldClustersAllocator: WorldClustersAllocator;

    constructor(scene: Scene, graphicsDevice: GraphicsDevice) {
        super(scene, graphicsDevice);
        this.scene = scene;
        this.graphicsDevice = graphicsDevice;
        this.layers = [];
        this.camera = null;
        this.shadowMapCache = new ShadowMapCache();
        this.worldClustersAllocator = new WorldClustersAllocator();
    }

    render(): void {
        if (!this.camera) return;

        const visibleMeshes = this.cull();
        this.renderShadows(visibleMeshes);
        
        for (const layer of this.layers) {
            const layerMeshes = visibleMeshes.filter(mesh => mesh.layer === layer);
            const sortedMeshes = this.sortMeshInstances(layerMeshes);
            
            for (const mesh of sortedMeshes) {
                this.drawInstance(mesh);
            }
        }
    }

    cull(): MeshInstance[] {
        if (!this.camera) return [];

        const frustumMatrix = this.camera.getProjectionMatrix().clone().mul(this.camera.getViewMatrix());
        const visibleMeshes: MeshInstance[] = [];

        for (const mesh of this.scene.meshInstances) {
            const bbox = mesh.getBoundingBox();
            if (this.isVisible(frustumMatrix, bbox)) {
                visibleMeshes.push(mesh);
            }
        }

        return visibleMeshes;
    }

    private isVisible(frustumMatrix: Mat4, bbox: BoundingBox): boolean {
        // Simplified frustum culling - check if bbox center is within frustum
        const center = bbox.getCenter();
        const clipSpace = frustumMatrix.transformPoint(center);
        
        return clipSpace.x >= -1 && clipSpace.x <= 1 &&
               clipSpace.y >= -1 && clipSpace.y <= 1 &&
               clipSpace.z >= -1 && clipSpace.z <= 1;
    }

    renderShadows(meshes: MeshInstance[]): void {
        const shadowCasters = meshes.filter(mesh => mesh.castShadows);
        const shadowLights = this.scene.lights.filter(light => light.castShadows);

        for (const light of shadowLights) {
            const shadowMap = this.shadowMapCache.getShadowMap(light);
            this.graphicsDevice.setRenderTarget(shadowMap);
            this.graphicsDevice.clear(0, 0, 0, 1);

            for (const mesh of shadowCasters) {
                if (this.isShadowCaster(mesh, light)) {
                    this.drawShadowMesh(mesh, light);
                }
            }
        }
    }

    private isShadowCaster(mesh: MeshInstance, light: Light): boolean {
        // Check if mesh is within light's shadow range
        const lightPos = light.getPosition();
        const meshPos = mesh.getPosition();
        const distance = lightPos.distance(meshPos);
        return distance <= light.shadowDistance;
    }

    private drawShadowMesh(mesh: MeshInstance, light: Light): void {
        // Set up shadow shader and draw mesh
        const shadowShader = this.graphicsDevice.getShader('shadow');
        shadowShader.setParameter('uLightMatrix', light.getShadowMatrix());
        shadowShader.setParameter('uModelMatrix', mesh.getWorldTransform());
        
        this.graphicsDevice.setShader(shadowShader);
        this.graphicsDevice.draw(mesh.mesh);
    }

    sortMeshInstances(meshes: MeshInstance[]): MeshInstance[] {
        return meshes.sort((a, b) => {
            // Sort by material first
            if (a.material.id !== b.material.id) {
                return a.material.id - b.material.id;
            }
            
            // Then by mesh
            if (a.mesh.id !== b.mesh.id) {
                return a.mesh.id - b.mesh.id;
            }
            
            // Finally by distance for transparency
            if (this.camera) {
                const distA = this.camera.getPosition().distance(a.getPosition());
                const distB = this.camera.getPosition().distance(b.getPosition());
                return distB - distA; // Back to front for transparency
            }
            
            return 0;
        });
    }

    setCamera(camera: Camera): void {
        this.camera = camera;
        this.graphicsDevice.setViewport(0, 0, camera.width, camera.height);
        this.graphicsDevice.setScissor(0, 0, camera.width, camera.height);
    }

    dispatchGlobalLights(): void {
        const globalLights = this.scene.lights.filter(light => light.type === 'directional');
        
        for (let i = 0; i < Math.min(globalLights.length, 4); i++) {
            const light = globalLights[i];
            const shader = this.graphicsDevice.getActiveShader();
            
            if (shader) {
                shader.setParameter(`uGlobalLightDir[${i}]`, light.getDirection());
                shader.setParameter(`uGlobalLightColor[${i}]`, light.getColor());
                shader.setParameter(`uGlobalLightIntensity[${i}]`, light.getIntensity());
            }
        }
    }

    drawInstance(mesh: MeshInstance): void {
        if (!mesh.visible) return;

        const material = mesh.material;
        const shader = material.getShader();
        
        this.graphicsDevice.setShader(shader);
        
        // Set material properties
        shader.setParameter('uMaterialColor', material.getColor());
        shader.setParameter('uMaterialTexture', material.getTexture());
        
        // Set transform
        shader.setParameter('uModelMatrix', mesh.getWorldTransform());
        shader.setParameter('uNormalMatrix', mesh.getNormalMatrix());
        
        // Set camera
        if (this.camera) {
            shader.setParameter('uViewMatrix', this.camera.getViewMatrix());
            shader.setParameter('uProjectionMatrix', this.camera.getProjectionMatrix());
            shader.setParameter('uCameraPos', this.camera.getPosition());
        }
        
        // Dispatch lights
        this.dispatchGlobalLights();
        
        // Draw
        this.graphicsDevice.draw(mesh.mesh);
    }
}
