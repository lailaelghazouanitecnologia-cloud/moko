import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { GraphicsDevice } from './graphics-device';
import { Shader } from './shader';
import { Texture } from './texture';
import { Material } from './material';
import { Mesh } from './mesh';
import { MeshInstance } from './mesh-instance';

export class ScopeSpace {
    private device: GraphicsDevice;
    private shader: Shader;
    private texture: Texture;
    private material: Material;
    private mesh: Mesh;
    private meshInstance: MeshInstance;
    private transform: Mat4;
    private position: Vec3;
    private rotation: Vec3;
    private scale: Vec3;
    private visible: boolean;
    private dirty: boolean;

    constructor(device: GraphicsDevice, options?: {
        position?: Vec3,
        rotation?: Vec3,
        scale?: Vec3,
        shader?: Shader,
        texture?: Texture
    }) {
        this.device = device;
        this.position = options?.position ? new Vec3(options.position.x, options.position.y, options.position.z) : new Vec3(0, 0, 0);
        this.rotation = options?.rotation ? new Vec3(options.rotation.x, options.rotation.y, options.rotation.z) : new Vec3(0, 0, 0);
        this.scale = options?.scale ? new Vec3(options.scale.x, options.scale.y, options.scale.z) : new Vec3(1, 1, 1);
        this.transform = new Mat4();
        this.visible = true;
        this.dirty = true;

        this.shader = options?.shader || this.createDefaultShader();
        this.texture = options?.texture || this.createDefaultTexture();
        this.material = this.createMaterial();
        this.mesh = this.createMesh();
        this.meshInstance = new MeshInstance(this.mesh, this.material);
    }

    private createDefaultShader(): Shader {
        const vertexShader = `
            attribute vec3 aPosition;
            attribute vec2 aUv;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec2 vUv;
            
            void main() {
                vUv = aUv;
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
            }
        `;

        const fragmentShader = `
            precision mediump float;
            uniform sampler2D uTexture;
            varying vec2 vUv;
            
            void main() {
                gl_FragColor = texture2D(uTexture, vUv);
            }
        `;

        return new Shader(this.device, vertexShader, fragmentShader);
    }

    private createDefaultTexture(): Texture {
        const texture = new Texture(this.device, 1, 1);
        const data = new Uint8Array([255, 255, 255, 255]);
        texture.setData(data);
        return texture;
    }

    private createMaterial(): Material {
        const material = new Material(this.shader);
        material.setParameter('uTexture', this.texture);
        return material;
    }

    private createMesh(): Mesh {
        const positions = new Float32Array([
            -0.5, -0.5, 0.0,
             0.5, -0.5, 0.0,
             0.5,  0.5, 0.0,
            -0.5,  0.5, 0.0
        ]);

        const uvs = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);

        const mesh = new Mesh(this.device);
        mesh.setPositions(positions);
        mesh.setUvs(uvs);
        mesh.setIndices(indices);
        return mesh;
    }

    render(viewMatrix: Mat4, projectionMatrix: Mat4): void {
        if (!this.visible) return;

        this.updateTransform();
        
        this.material.setParameter('uModelMatrix', this.transform);
        this.material.setParameter('uViewMatrix', viewMatrix);
        this.material.setParameter('uProjectionMatrix', projectionMatrix);
        
        this.device.render([this.meshInstance]);
    }

    update(deltaTime: number): void {
        // Update logic can be extended here
        // For now, just mark as dirty if needed
    }

    private updateTransform(): void {
        if (!this.dirty) return;

        this.transform.setIdentity();
        this.transform.translate(this.position);
        this.transform.rotate(this.rotation);
        this.transform.scale(this.scale);
        
        this.dirty = false;
    }

    setPosition(x: number, y: number, z: number): void {
        this.position.set(x, y, z);
        this.dirty = true;
    }

    setRotation(x: number, y: number, z: number): void {
        this.rotation.set(x, y, z);
        this.dirty = true;
    }

    setScale(x: number, y: number, z: number): void {
        this.scale.set(x, y, z);
        this.dirty = true;
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    getPosition(): Vec3 {
        return this.position;
    }

    getRotation(): Vec3 {
        return this.rotation;
    }

    getScale(): Vec3 {
        return this.scale;
    }

    isVisible(): boolean {
        return this.visible;
    }

    setShader(shader: Shader): void {
        this.shader = shader;
        this.material.shader = shader;
    }

    setTexture(texture: Texture): void {
        this.texture = texture;
        this.material.setParameter('uTexture', texture);
    }

    getShader(): Shader {
        return this.shader;
    }

    getTexture(): Texture {
        return this.texture;
    }

    getMaterial(): Material {
        return this.material;
    }

    getMesh(): Mesh {
        return this.mesh;
    }

    getMeshInstance(): MeshInstance {
        return this.meshInstance;
    }

    destroy(): void {
        if (this.meshInstance) {
            this.meshInstance.destroy();
        }
        if (this.mesh) {
            this.mesh.destroy();
        }
        if (this.material) {
            this.material.destroy();
        }
        if (this.texture) {
            this.texture.destroy();
        }
        if (this.shader) {
            this.shader.destroy();
        }
    }
}
