import { Renderer } from './renderer';
import { GraphicsDevice } from '../graphics/graphics-device';
import { Scene } from './scene';
import { Camera } from './camera';
import { Light } from './light';
import { MeshInstance } from '../graphics/mesh-instance';
import { Layer } from './layer';
import { ShadowMapCache } from '../graphics/shadow-map-cache';
import { WorldClustersAllocator } from '../graphics/world-clusters-allocator';
import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Frustum } from '../math/frustum';
import { BoundingSphere } from '../math/bounding-sphere';

export class ForwardRenderer extends Renderer {
    scene: Scene;
    graphicsDevice: GraphicsDevice;
    layers: Layer[];
    camera: Camera;
    shadowMapCache: ShadowMapCache;
    worldClustersAllocator: WorldClustersAllocator;

    private _viewMat: Mat4 = new Mat4();
    private _projMat: Mat4 = new Mat4();
    private _viewProjMat: Mat4 = new Mat4();
    private _frustum: Frustum = new Frustum();
    private _tempSphere: BoundingSphere = new BoundingSphere();

    constructor(scene: Scene, device: GraphicsDevice) {
        super(scene, device);
        this.scene = scene;
        this.graphicsDevice = device;
        this.layers = [];
        this.shadowMapCache = new ShadowMapCache(device);
        this.worldClustersAllocator = new WorldClustersAllocator(device);
    }

    render(): void {
        if (!this.camera) return;

        this.setCamera(this.camera);
        this.cull();
        this.renderShadows();

        this.graphicsDevice.clear(this.camera.clearColor);

        for (const layer of this.layers) {
            if (!layer.enabled) continue;

            const visible = layer.opaqueMeshInstances.filter(mi => mi.visible);
            this.sortMeshInstances(visible, layer.sortMode);

            for (const mesh of visible) {
                this.drawInstance(mesh);
            }

            const transparent = layer.transparentMeshInstances.filter(mi => mi.visible);
            this.sortMeshInstances(transparent, SORTMODE_BACK2FRONT);

            for (const mesh of transparent) {
                this.drawInstance(mesh);
            }
        }
    }

    cull(): void {
        const camPos = this.camera.node.getWorldPosition();
        const camFwd = this.camera.node.forward.clone().mulScalar(-1);
        this._frustum.setFromMat4(this._viewProjMat);

        for (const layer of this.layers) {
            const opaque: MeshInstance[] = [];
            const transparent: MeshInstance[] = [];

            for (const mi of layer.meshInstances) {
                if (!mi.mesh || !mi.node) continue;

                const bounds = mi.mesh.aabb;
                this._tempSphere.center.copy(bounds.center);
                this._tempSphere.radius = bounds.halfExtents.length();

                if (!this._frustum.containsSphere(this._tempSphere)) continue;

                if (mi.material && mi.material.blend) {
                    transparent.push(mi);
                } else {
                    opaque.push(mi);
                }
            }

            layer.opaqueMeshInstances = opaque;
            layer.transparentMeshInstances = transparent;
        }
    }

    renderShadows(): void {
        const casters = this.scene.lights.filter(l => l.castShadows);
        if (casters.length === 0) return;

        const shadowPass = this.shadowMapCache.begin();

        for (const light of casters) {
            const shadowMap = shadowPass.getShadowMap(light);
            if (!shadowMap) continue;

            this.graphicsDevice.setRenderTarget(shadowMap);
            this.graphicsDevice.clear(new Vec3(1, 1, 1));

            const shadowCamera = light.shadowCamera;
            this.setCamera(shadowCamera);

            const culled: MeshInstance[] = [];
            for (const layer of this.layers) {
                for (const mi of layer.meshInstances) {
                    if (!mi.castShadows || !mi.node) continue;
                    const bounds = mi.mesh.aabb;
                    this._tempSphere.center.copy(bounds.center);
                    this._tempSphere.radius = bounds.halfExtents.length();
                    if (this._frustum.containsSphere(this._tempSphere)) {
                        culled.push(mi);
                    }
                }
            }

            for (const mi of culled) {
                this.drawInstance(mi);
            }
        }

        shadowPass.end();
    }

    sortMeshInstances(list: MeshInstance[], mode: number): void {
        switch (mode) {
            case SORTMODE_NONE:
                return;
            case SORTMODE_MANUAL:
                list.sort((a, b) => a.drawOrder - b.drawOrder);
                return;
            case SORTMODE_MATERIALMESH:
                list.sort((a, b) => {
                    const keyA = (a.material?.id ?? 0) * 100000 + (a.mesh?.id ?? 0);
                    const keyB = (b.material?.id ?? 0) * 100000 + (b.mesh?.id ?? 0);
                    return keyA - keyB;
                });
                return;
            case SORTMODE_BACK2FRONT:
                list.sort((a, b) => {
                    const za = a.node.getWorldPosition().z;
                    const zb = b.node.getWorldPosition().z;
                    return za - zb;
                });
                return;
            case SORTMODE_FRONT2BACK:
                list.sort((a, b) => {
                    const za = a.node.getWorldPosition().z;
                    const zb = b.node.getWorldPosition().z;
                    return zb - za;
                });
                return;
        }
    }

    setCamera(camera: Camera): void {
        this.camera = camera;
        const node = camera.node;
        const pos = node.getWorldPosition();
        const rot = node.getWorldRotation();

        this._viewMat.setLookAt(pos, pos.clone().add(rot.transformVector(Vec3.FORWARD)), rot.transformVector(Vec3.UP));
        this._projMat.setPerspective(camera.fov, camera.aspectRatio, camera.nearClip, camera.farClip);
        this._viewProjMat.mul2(this._projMat, this._viewMat);

        this.graphicsDevice.setViewport(0, 0, camera.renderTarget?.width ?? this.graphicsDevice.canvas.width, camera.renderTarget?.height ?? this.graphicsDevice.canvas.height);
    }

    dispatchGlobalLights(): void {
        const scope = this.graphicsDevice.scope;
        const dirs: Vec3[] = [];
        const colors: Vec3[] = [];
        const intensities: number[] = [];

        for (const light of this.scene.lights) {
            if (light.type === 'directional') {
                dirs.push(light.node.forward.clone().mulScalar(-1));
                colors.push(light.color);
                intensities.push(light.intensity);
            }
        }

        scope.setValue('u_dirLightCount', Math.min(dirs.length, 4));
        for (let i = 0; i < 4; i++) {
            if (i < dirs.length) {
                scope.setValue(`u_dirLightDirection[${i}]`, dirs[i]);
                scope.setValue(`u_dirLightColor[${i}]`, colors[i]);
                scope.setValue(`u_dirLightIntensity[${i}]`, intensities[i]);
            } else {
                scope.setValue(`u_dirLightDirection[${i}]`, Vec3.ZERO);
                scope.setValue(`u_dirLightColor[${i}]`, Vec3.ZERO);
                scope.setValue(`u_dirLightIntensity[${i}]`, 0);
            }
        }
    }

    drawInstance(mesh: MeshInstance): void {
        if (!mesh.mesh || !mesh.material || !mesh.node) return;

        mesh.material.bind();
        mesh.material.setParameter('u_viewProjectionMatrix', this._viewProjMat.data);
        mesh.material.setParameter('u_modelMatrix', mesh.node.worldTransform.data);
        mesh.material.setParameter('u_normalMatrix', mesh.node.worldTransform.invert().transpose().data);

        this.dispatchGlobalLights();

        this.graphicsDevice.setVertexBuffer(mesh.mesh.vertexBuffer);
        this.graphicsDevice.setIndexBuffer(mesh.mesh.indexBuffer);
        this.graphicsDevice.draw(mesh.mesh.primitive);
    }
}

const SORTMODE_NONE = 0;
const SORTMODE_MANUAL = 1;
const SORTMODE_MATERIALMESH = 2;
const SORTMODE_BACK2FRONT = 3;
const SORTMODE_FRONT2BACK = 4;
