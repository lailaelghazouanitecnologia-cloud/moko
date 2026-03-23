import { Node } from './Node';
import { Camera } from './Camera';
import { RenderContext } from '../graphics/RenderContext';
import { ForwardRenderer } from '../scene/renderer/ForwardRenderer';

export class Scene {
    name: string = 'Scene';
    root: Node;
    newsRoot: Node;
    camera: Camera;
    renderContext: RenderContext;
    loaded: boolean = false;
    trash: Set<Node> = new Set<Node>();

    constructor() {
        this.root = new Node('root');
        this.newsRoot = new Node('newsRoot');
        this.camera = new Camera();
        this.renderContext = new RenderContext();
    }

    addObject(node: Node): void {
        this.newsRoot.addChild(node);
    }

    flush(): void {
        const children = [...this.newsRoot.children];
        for (const child of children) {
            child.setParent(this.root);
        }
    }

    reset(): void {
        this.root.destroy();
        this.newsRoot.destroy();
        this.trash.clear();
        this.root = new Node('root');
        this.newsRoot = new Node('newsRoot');
        this.loaded = false;
    }

    hasNewObjects(): boolean {
        return this.newsRoot.children.length > 0;
    }

    deleteObject(node: Node): void {
        this.trash.add(node);
    }

    cleanTrash(): void {
        for (const node of this.trash) {
            node.destroy();
        }
        this.trash.clear();
    }

    findNodeByName(name: string): Node | null {
        const search = (node: Node): Node | null => {
            if (node.name === name) return node;
            for (const child of node.children) {
                const found = search(child);
                if (found) return found;
            }
            return null;
        };
        let found = search(this.root);
        if (found) return found;
        return search(this.newsRoot);
    }

    getActiveCameras(): Camera[] {
        const cameras: Camera[] = [];
        const collect = (node: Node) => {
            const cam = node.getComponent(Camera);
            if (cam && cam.enabled) cameras.push(cam);
            for (const child of node.children) collect(child);
        };
        collect(this.root);
        collect(this.newsRoot);
        return cameras;
    }

    update(dt: number): void {
        const updateNode = (node: Node) => {
            for (const comp of node.components) {
                if (comp.enabled && !comp.destroyed) {
                    comp.update?.(dt);
                }
            }
            for (const child of node.children) updateNode(child);
        };
        updateNode(this.root);
        updateNode(this.newsRoot);
    }

    render(renderer: ForwardRenderer): void {
        renderer.render();
    }
}
