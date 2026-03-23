import { EventEmitter } from '../core';
import { Vec3, Mat4, Frustum } from '../math';
import { WebGLDevice, Texture } from '../graphics';
import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { BatchManager } from './batch-manager';

export class Renderer {
    scene: Scene;
    device: WebGLDevice;

    constructor(scene: Scene, device: WebGLDevice) {
        this.scene = scene;
        this.device = device;
    }

    render(): void {
        throw new Error('Renderer.render() must be implemented by subclass');
    }

    _cull(camera: Camera, drawCalls: any[]): any[] {
        const frustum = new Frustum();
        frustum.setFromMat4(camera.projectionMatrix.clone().mul(camera.viewMatrix));
        return drawCalls.filter(drawCall => {
            if (!drawCall.aabb) return true;
            return frustum.containsAabb(drawCall.aabb);
        });
    }
}

export class ForwardRenderer extends Renderer {
    scene: Scene;
    graphicsDevice: WebGLDevice;
    layers: any[];
    camera: Camera | null;
    shadowMapCache: Map<string, Texture>;
    worldClustersAllocator: any;

    constructor(scene: Scene, graphicsDevice: WebGLDevice) {
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

        const drawCalls = this.gatherDrawCalls();
        const visibleDrawCalls = this.cull(this.camera, drawCalls);

        this.renderShadows(visibleDrawCalls);
        this.dispatchGlobalLights(this.camera);

        const sortedDrawCalls = this.sortMeshInstances(visibleDrawCalls);

        this.graphicsDevice.clear({
            color: this.camera.clearColor,
            depth: 1.0,
            stencil: 0
        });

        const viewport = this.camera.rect;
        this.graphicsDevice.setViewport(viewport.x, viewport.y, viewport.z, viewport.w);

        for (const drawCall of sortedDrawCalls) {
            this.drawInstance(drawCall);
        }
    }

    cull(camera: Camera, drawCalls: any[]): any[] {
        return this._cull(camera, drawCalls);
    }

    renderShadows(drawCalls: any[]): void {
        const shadowCasters = drawCalls.filter(drawCall => drawCall.castShadows);
        const lights = this.scene.lights.filter((light: Light) => light.castShadows);

        for (const light of lights) {
            const shadowCamera = light.shadowCamera;
            if (!shadowCamera) continue;

            const shadowDrawCalls = this.cull(shadowCamera, shadowCasters);
            const shadowMap = this.shadowMapCache.get(light.id) || this.createShadowMap(light);
            this.shadowMapCache.set(light.id, shadowMap);

            this.graphicsDevice.setRenderTarget(shadowMap);
            this.graphicsDevice.clear({ depth: 1.0 });

            for (const drawCall of shadowDrawCalls) {
                this.drawInstance(drawCall);
            }
        }

        this.graphicsDevice.setRenderTarget(null);
    }

    sortMeshInstances(drawCalls: any[]): any[] {
        return drawCalls.sort((a, b) => {
            if (a.layer !== b.layer) return a.layer - b.layer;
            if (a.material.id !== b.material.id) return a.material.id - b.material.id;
            return a.mesh.id - b.mesh.id;
        });
    }

    setCamera(camera: Camera): void {
        this.camera = camera;
    }

    dispatchGlobalLights(camera: Camera): void {
        const globalLights = this.scene.lights.filter((light: Light) => light.type === 'directional');
        const scope = this.graphicsDevice.scope;

        for (let i = 0; i < 4; i++) {
            const light = globalLights[i];
            if (light) {
                scope.setValue(`lightDir[${i}]`, light.direction);
                scope.setValue(`lightColor[${i}]`, light.color);
                scope.setValue(`lightIntensity[${i}]`, light.intensity);
            } else {
                scope.setValue(`lightDir[${i}]`, Vec3.ZERO);
                scope.setValue(`lightColor[${i}]`, Color.BLACK);
                scope.setValue(`lightIntensity[${i}]`, 0);
            }
        }
    }

    drawInstance(drawCall: any): void {
        const mesh = drawCall.mesh;
        const material = drawCall.material;
        const node = drawCall.node;

        material.bind(this.graphicsDevice);
        material.updateShader(this.graphicsDevice);

        const worldMatrix = node.getWorldTransform();
        this.graphicsDevice.scope.setValue('matrix_model', worldMatrix.data);
        this.graphicsDevice.scope.setValue('matrix_normal', worldMatrix.clone().invert().transpose().data);

        mesh.bind();
        mesh.render();
    }

    private gatherDrawCalls(): any[] {
        const drawCalls: any[] = [];
        this.scene.root.forEach((node: GraphNode) => {
            const entity = node as Entity;
            if (!entity) return;

            const meshRenderer = entity.getComponent('meshRenderer') as MeshRenderer;
            if (meshRenderer && meshRenderer.enabled && meshRenderer.mesh) {
                drawCalls.push({
                    mesh: meshRenderer.mesh,
                    material: meshRenderer.material,
                    node: node,
                    layer: meshRenderer.layer,
                    aabb: meshRenderer.aabb,
                    castShadows: meshRenderer.castShadows
                });
            }
        });
        return drawCalls;
    }

    private createShadowMap(light: Light): Texture {
        return new Texture(this.graphicsDevice, {
            width: light.shadowResolution,
            height: light.shadowResolution,
            format: 'DEPTH',
            mipmaps: false
        });
    }
}
