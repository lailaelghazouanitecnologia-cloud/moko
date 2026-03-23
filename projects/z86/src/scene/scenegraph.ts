import { Entity } from './entity';
import { Component } from './component';
import { Transform } from './transform';
import { GraphNode } from './graphnode';

export class SceneGraph {
  private root: GraphNode | null = null;
  private nodeMap: Map<string, GraphNode> = new Map();

  constructor() {}

  public addNode(node: GraphNode, parentId?: string): void {
    if (parentId) {
      const parent = this.nodeMap.get(parentId);
      if (!parent) {
        throw new Error(`Parent node with id ${parentId} not found`);
      }
      parent.addChild(node);
    } else {
      if (this.root) {
        throw new Error('Root node already exists');
      }
      this.root = node;
    }
    this.nodeMap.set(node.getId(), node);
  }

  public removeNode(nodeId: string): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node with id ${nodeId} not found`);
    }

    const parent = node.getParent();
    if (parent) {
      parent.removeChild(node);
    } else if (this.root === node) {
      this.root = null;
    }

    this.nodeMap.delete(nodeId);
  }

  public render(): void {
    if (this.root) {
      this.renderNode(this.root);
    }
  }

  private renderNode(node: GraphNode): void {
    const transform = node.getComponent(Transform);
    if (transform) {
      transform.apply();
    }

    const entity = node.getEntity();
    if (entity) {
      entity.render();
    }

    for (const child of node.getChildren()) {
      this.renderNode(child);
    }

    if (transform) {
      transform.restore();
    }
  }

  public update(deltaTime: number): void {
    if (this.root) {
      this.updateNode(this.root, deltaTime);
    }
  }

  private updateNode(node: GraphNode, deltaTime: number): void {
    const entity = node.getEntity();
    if (entity) {
      entity.update(deltaTime);
    }

    for (const child of node.getChildren()) {
      this.updateNode(child, deltaTime);
    }
  }

  public getRoot(): GraphNode | null {
    return this.root;
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  public getAllNodes(): GraphNode[] {
    return Array.from(this.nodeMap.values());
  }

  public clear(): void {
    this.root = null;
    this.nodeMap.clear();
  }
}
