import { Node } from './Node';
import { Camera } from './Camera';
import { Light } from './Light';
import { Mesh } from './Mesh';
import { ForwardRenderer } from './renderer/ForwardRenderer';
import { RenderQueue } from './RenderQueue';

export class Scene {
    root: Node | null = null;
    cameras: Camera[] = [];
    lights: Light[] = [];
    meshes: Mesh[] = [];
    renderQueue: RenderQueue | null = null;
    loaded: boolean = false;
    trash: Node[] = [];

    addNode(node: Node): void {
        if (!this.root) {
            this.root = node;
        } else {
            this.root.addChild(node);
        }
    }

    removeNode(node: Node): void {
        if (node.parent) {
            node.parent.removeChild(node);
        } else if (this.root === node) {
            this.root = null;
        }
        this.trash.push(node);
    }

    addCamera(camera: Camera): void {
        if (!this.cameras.includes(camera)) {
            this.cameras.push(camera);
        }
    }

    removeCamera(camera: Camera): void {
        const index = this.cameras.indexOf(camera);
        if (index !== -1) {
            this.cameras.splice(index, 1);
        }
    }

    addLight(light: Light): void {
        if (!this.lights.includes(light)) {
            this.lights.push(light);
        }
    }

    removeLight(light: Light): void {
        const index = this.lights.indexOf(light);
        if (index !== -1) {
            this.lights.splice(index, 1);
        }
    }

    findNode(name: string): Node | null {
        if (!this.root) return null;
        
        const queue: Node[] = [this.root];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.name === name) {
                return current;
            }
            queue.push(...current.children);
        }
        
        return null;
    }

    findNodesByTag(tag: string): Node[] {
        const results: Node[] = [];
        if (!this.root) return results;
        
        const queue: Node[] = [this.root];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.tags && current.tags.includes(tag)) {
                results.push(current);
            }
            queue.push(...current.children);
        }
        
        return results;
    }

    update(deltaTime: number): void {
        if (!this.root) return;
        
        const queue: Node[] = [this.root];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.enabled) {
                current.update(deltaTime);
            }
            queue.push(...current.children);
        }
    }

    render(renderer: ForwardRenderer): void {
        if (!this.root || !this.renderQueue) return;
        
        this.renderQueue.clear();
        
        const queue: Node[] = [this.root];
        
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.enabled && current.mesh) {
                this.renderQueue.add(current.mesh);
            }
            queue.push(...current.children);
        }
        
        renderer.render(this);
    }

    flush(): void {
        // Process any pending operations
        // In a two-root system, this would merge newsRoot to root
        // For now, just mark as loaded if we have content
        if (this.root || this.cameras.length > 0 || this.lights.length > 0) {
            this.loaded = true;
        }
    }

    cleanTrash(): void {
        while (this.trash.length > 0) {
            const node = this.trash.pop();
            if (node) {
                node.destroy();
            }
        }
    }

    reset(): void {
        if (this.root) {
            this.root.destroy();
            this.root = null;
        }
        
        this.cameras.length = 0;
        this.lights.length = 0;
        this.meshes.length = 0;
        this.trash.length = 0;
        this.loaded = false;
        
        if (this.renderQueue) {
            this.renderQueue.clear();
        }
    }

    hasNewObjects(): boolean {
        // Check if there are pending additions
        // In a two-root system, check if newsRoot has children
        // For now, just check if we have content but not loaded
        return !this.loaded && (this.root !== null || this.cameras.length > 0 || this.lights.length > 0);
    }
}
