import { Display } from './display';
import { Pixel } from './pixel';
import { Sprite } from './sprite';

export class Renderer {
  private scene: any;
  private device: any;

  constructor(scene: any, device: any) {
    this.scene = scene;
    this.device = device;
  }

  render(): void {
    this._cull();
    // draw entire frame
    const meshes = this.scene.getMeshes();
    for (const mesh of meshes) {
      this.device.draw(mesh);
    }
  }

  private _cull(): void {
    // remove hidden meshes
    const meshes = this.scene.getMeshes();
    const visible: any[] = [];
    for (const mesh of meshes) {
      if (!mesh.isCulled()) {
        visible.push(mesh);
      }
    }
    this.scene.setVisibleMeshes(visible);
  }

  resize(width: number, height: number): void {
    this.device.resize(width, height);
  }
}
