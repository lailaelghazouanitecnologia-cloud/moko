import { EventEmitter } from '../core';
import { Vec3, Mat4, BoundingSphere, Frustum } from '../math';
import { GraphicsDevice, Shader, Texture, RenderTarget, Material, MeshInstance } from '../graphics';
import { Scene } from './scene';
import { Camera } from './camera';
import { Light } from './light';
import { Renderer } from './renderer';

export class ForwardRenderer extends Renderer {
    scene: Scene;
    graphicsDevice: GraphicsDevice;
    layers: any[];
    camera: Camera | null;
    shadowMapCache: Map<string, RenderTarget>;
    worldClustersAllocator: any;

    constructor(scene: Scene, graphicsDevice: GraphicsDevice) {
        super(scene, graphicsDevice);
        this.scene = scene;
        this.graphicsDevice = graphicsDevice;
        this.layers = [];
        this.camera = null;
        this.shadowMapCache = new Map();
        this.worldClustersAllocator = null;
    }

    render(): void {
        if (!this.camera) return;

        this.cull();
        this.renderShadows();

        const cameraMatrix = this.camera.getViewMatrix();
        const projMatrix = this.camera.getProjectionMatrix();

        this.graphicsDevice.clear({
            color: this.camera.clearColor,
            depth: 1.0,
            stencil: 0
        });

        for (const layer of this.layers) {
            const meshInstances = layer.meshInstances;
            this.sortMeshInstances(meshInstances);

            for (const meshInstance of meshInstances) {
                if (!meshInstance.visible) continue;
                this.drawInstance(meshInstance, cameraMatrix, projMatrix);
            }
        }
    }

    cull(): void {
        if (!this.camera) return;

        const frustum = this.camera.frustum;
        const position = this.camera.entity.getPosition();

        for (const layer of this.layers) {
            const meshInstances = layer.meshInstances;
            for (const meshInstance of meshInstances) {
                const mesh = meshInstance.mesh;
                const node = meshInstance.node;
                const worldBounds = mesh.aabb.clone();
                worldBounds.transform(node.getWorldTransform());

                meshInstance.visible = frustum.containsSphere(new BoundingSphere(worldBounds.center, worldBounds.halfExtents.length());
            }
        }
    }

    renderShadows(): void {
        const lights = this.scene.findComponents('light') as Light[];
        for (const light of lights) {
            if (!light.castShadows) continue;

            const shadowMap = this.shadowMapCache.get(light.entity.name) || new RenderTarget({
                width: 2048,
                height: 2048,
                format: 'DEPTH'
            });
            this.shadowMapCache.set(light.entity.name, shadowMap);

            this.graphicsDevice.setRenderTarget(shadowMap);
            this.graphicsDevice.clear({ depth: 1.0 });

            const lightMatrix = light.getShadowMatrix();
            const shadowShader = Shader.getShadowShader();

            for (const layer of this.layers) {
                const meshInstances = layer.meshInstances;
                for (const meshInstance of meshInstances) {
                    if (!meshInstance.castShadows) continue;

                    const modelMatrix = meshInstance.node.getWorldTransform();
                    shadowShader.setUniform('uModelMatrix', modelMatrix.data);
                    shadowShader.setUniform('uLightMatrix', lightMatrix.data);

                    this.graphicsDevice.draw(meshInstance.mesh);
                }
            }
        }

        this.graphicsDevice.setRenderTarget(null);
    }

    sortMeshInstances(meshInstances: MeshInstance[]): void {
        meshInstances.sort((a, b) => {
            const materialA = a.material;
            const materialB = b.material;

            if (materialA.blendType !== materialB.blendType) {
                return materialA.blendType - materialB.blendType;
            }

            if (materialA.id !== materialB.id) {
                return materialA.id - materialB.id;
            }

            return a.id - b.id;
        });
    }

    setCamera(camera: Camera): void {
        this.camera = camera;
    }

    dispatchGlobalLights(): void {
        const lights = this.scene.findComponents('light') as Light[];
        const directionalLights: Light[] = [];
        const pointLights: Light[] = [];
        const spotLights: Light[] = [];

        for (const light of lights) {
            switch (light.type) {
                case 'directional':
                    directionalLights.push(light);
                    break;
                case 'point':
                    pointLights.push(light);
                    break;
                case 'spot':
                    spotLights.push(light);
                    break;
            }
        }

        const shader = Shader.getActiveShader();
        shader.setUniform('uDirLightCount', directionalLights.length);
        shader.setUniform('uPointLightCount', pointLights.length);
        shader.setUniform('uSpotLightCount', spotLights.length);

        for (let i = 0; i < directionalLights.length; i++) {
            const light = directionalLights[i];
            shader.setUniform(`uDirLights[${i}].direction`, light.direction.data);
            shader.setUniform(`uDirLights[${i}].color`, light.color.data);
            shader.setUniform(`uDirLights[${i}].intensity`, light.intensity);
        }

        for (let i = 0; i < pointLights.length; i++) {
            const light = pointLights[i];
            shader.setUniform(`uPointLights[${i}].position`, light.entity.getPosition().data);
            shader.setUniform(`uPointLights[${i}].color`, light.color.data);
            shader.setUniform(`uPointLights[${i}].intensity`, light.intensity);
            shader.setUniform(`uPointLights[${i}].range`, light.range);
        }

        for (let i = 0; i < spotLights.length; i++) {
            const light = spotLights[i];
            shader.setUniform(`uSpotLights[${i}].position`, light.entity.getPosition().data);
            shader.setUniform(`uSpotLights[${i}].direction`, light.direction.data);
            shader.setUniform(`uSpotLights[${i}].color`, light.color.data);
            shader.setUniform(`uSpotLights[${i}].intensity`, light.intensity);
            shader.setUniform(`uSpotLights[${i}].range`, light.range);
            shader.setUniform(`uSpotLights[${i}].innerCone`, light.innerCone);
            shader.setUniform(`uSpotLights[${i}].outerCone`, light.outerCone);
        }
    }

    drawInstance(meshInstance: MeshInstance, cameraMatrix: Mat4, projMatrix: Mat4): void {
        const modelMatrix = meshInstance.node.getWorldTransform();
        const normalMatrix = modelMatrix.clone().invert().transpose();

        const shader = meshInstance.material.shader;
        shader.enable();

        shader.setUniform('uModelMatrix', modelMatrix.data);
        shader.setUniform('uNormalMatrix', normalMatrix.data);
        shader.setUniform('uViewMatrix', cameraMatrix.data);
        shader.setUniform('uProjectionMatrix', projMatrix.data);

        if (meshInstance.material.texture) {
            shader.setUniform('uTexture', meshInstance.material.texture);
        }

        this.dispatchGlobalLights();

        this.graphicsDevice.setBlendState(meshInstance.material.blendState);
        this.graphicsDevice.setDepthState(meshInstance.material.depthState);
        this.graphicsDevice.setCullMode(meshInstance.material.cullMode);

        this.graphicsDevice.draw(meshInstance.mesh);
    }
}
