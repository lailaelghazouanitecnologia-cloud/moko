import { EventEmitter } from '../core';
import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Camera } from './camera';

export class Scene extends EventEmitter {
  name: string;
  root: GraphNode;
  newsRoot: GraphNode;
  camera: Camera | null;
  renderContext: any;
  loaded: boolean;
  trash: Set<Entity>;

  constructor(name: string = 'Scene') {
    super();
    this.name = name;
    this.root = new GraphNode('root');
    this.newsRoot = new GraphNode('newsRoot');
    this.camera = null;
    this.renderContext = null;
    this.loaded = false;
    this.trash = new Set<Entity>();
  }

  addObject(entity: Entity): void {
    this.newsRoot.addChild(entity);
  }

  flush(): void {
    while (this.newsRoot.children.length > 0) {
      const child = this.newsRoot.children.shift()!;
      this.root.addChild(child);
    }
  }

  reset(): void {
    this.root.children.length = 0;
    this.newsRoot.children.length = 0;
    this.trash.clear();
    this.loaded = false;
  }

  hasNewObjects(): boolean {
    return this.newsRoot.children.length > 0;
  }

  deleteObject(entity: Entity): void {
    this.trash.add(entity);
  }

  cleanTrash(): void {
    for (const entity of this.trash) {
      entity.destroy();
    }
    this.trash.clear();
  }
}
