import { GameObject } from '../gameobject/GameObject';
import { Camera } from './Camera';
import { RenderContext } from './RenderContext';

export class Scene {
    name: string;
    root: GameObject;
    newsRoot: GameObject;
    camera: Camera | null;
    renderContext: RenderContext;
    loaded: boolean;
    trash: Set<GameObject>;

    constructor(name: string) {
        this.name = name;
        this.root = new GameObject('root');
        this.newsRoot = new GameObject('newsRoot');
        this.camera = null;
        this.renderContext = new RenderContext();
        this.loaded = false;
        this.trash = new Set<GameObject>();
    }

    addObject(gameObject: GameObject): void {
        this.newsRoot.addChild(gameObject);
        gameObject.scene = this;
    }

    flush(): void {
        const children = [...this.newsRoot.children];
        for (const child of children) {
            this.newsRoot.removeChild(child);
            this.root.addChild(child);
        }
    }

    reset(): void {
        this.root.destroy();
        this.newsRoot.destroy();
        this.root = new GameObject('root');
        this.newsRoot = new GameObject('newsRoot');
        this.trash.clear();
        this.loaded = false;
    }

    hasNewObjects(): boolean {
        return this.newsRoot.children.length > 0;
    }

    deleteObject(gameObject: GameObject): void {
        if (gameObject.parent) {
            gameObject.parent.removeChild(gameObject);
        }
        this.trash.add(gameObject);
    }

    cleanTrash(): void {
        for (const obj of this.trash) {
            obj.destroy();
        }
        this.trash.clear();
    }
}
