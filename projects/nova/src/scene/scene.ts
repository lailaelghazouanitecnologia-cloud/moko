import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { BatchManager } from './batch-manager';
import { ForwardRenderer } from './forward-renderer';
import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';
import { VertexFormat, Texture, Mesh } from '../graphics';

export class Scene {
  name: string;
  root: GraphNode;
  newsRoot: GraphNode;
  camera: Camera | null;
  renderContext: any;
  loaded: boolean;
  trash: Set<Entity>;

  constructor(name: string = '') {
    this.name = name;
    this.root = new GraphNode('root');
    this.newsRoot = new GraphNode('newsRoot');
    this.camera = null;
    this.renderContext = null;
    this.loaded = false;
    this.trash = new Set<Entity>();
  }

  addObject(obj: Entity): void {
    obj.scene = this;
    this.newsRoot.addChild(obj);
  }

  flush(): void {
    while (this.newsRoot.children.length > 0) {
      const child = this.newsRoot.children[0];
      this.newsRoot.removeChild(child);
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

  deleteObject(obj: Entity): void {
    this.trash.add(obj);
  }

  cleanTrash(): void {
    for (const obj of this.trash) {
      obj.destroy();
    }
    this.trash.clear();
  }
}
