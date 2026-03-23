import { GraphicsDevice } from './graphics-device';
import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';

export class ForwardRenderer {
  device: GraphicsDevice;
  proj = new Mat4();
  view = new Mat4();

  constructor(device: GraphicsDevice) {
    this.device = device;
  }

  setCamera(aspect: number, fov = 45, near = 0.1, far = 100) {
    this.proj.perspective(fov * Math.PI / 180, aspect, near, far);
    this.view.lookAt(new Vec3(0, 0, 3), Vec3.zero(), Vec3.up());
  }

  render(mesh: { vao: WebGLVertexArrayObject; vertexCount: number }) {
    this.device.clear(0.1, 0.1, 0.1, 1);
    this.device.setViewport(0, 0, this.device.width, this.device.height);
    this.device.draw(mesh);
  }
}
