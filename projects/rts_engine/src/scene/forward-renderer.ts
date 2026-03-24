import { Scene } from './scene';
import { GraphicsDevice } from '../graphics/graphics-device';
import { WebGLDevice } from '../graphics/web-gl-device';
import { BatchManager } from './batch-manager';
import { Camera } from './camera';
import { MeshRenderer } from './mesh-renderer';
import { Light } from './light';
import { Mat3 } from '../math/mat3';
import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Color } from '../math/color';
import { Texture } from '../graphics/texture';

/**
 * Forward rendering pipeline implementation.
 * Handles culling, light management, shadow mapping and forward rendering passes.
 */
export class ForwardRenderer {
  private scene: Scene;
  private graphicsDevice: GraphicsDevice;
  private batchManager: BatchManager;
  private camera: Camera | null = null;
  private renderQueue: MeshRenderer[] = [];
  private shadowCasters: MeshRenderer[] = [];
  private lights: Light[] = [];
  private textureUnitCounter: number = 0;
  private readonly MAX_DIRECTIONAL_LIGHTS = 4;
  private readonly MAX_POINT_LIGHTS = 8;

  constructor(scene: Scene, graphicsDevice: GraphicsDevice) {
    if (!scene) {
      throw new Error('Scene is required');
    }
    if (!graphicsDevice) {
      throw new Error('GraphicsDevice is required');
    }

    this.scene = scene;
    this.graphicsDevice = graphicsDevice;
    this.batchManager = new BatchManager();
  }

  /**
   * Main render entry point.
   * @param camera - The camera to render from
   * @throws Error if camera is null or invalid
   */
  render(camera: Camera): void {
    if (!camera) {
      throw new Error('Camera cannot be null');
    }

    this.camera = camera;
    
    try {
      this.cull();
      this.sortMeshInstances();
      this.dispatchGlobalLights();
      this.renderShadows();
      this.renderForward();
    } catch (error) {
      console.error('Error during rendering:', error);
      throw error;
    }
  }

  /**
   * Performs frustum culling to determine visible objects.
   * Populates renderQueue, shadowCasters and lights arrays.
   */
  private cull(): void {
    this.renderQueue.length = 0;
    this.shadowCasters.length = 0;
    this.lights.length = 0;

    if (!this.camera) {
      throw new Error('Camera not set');
    }

    const frustum = this.camera.getFrustum();
    if (!frustum) {
      throw new Error('Camera frustum is invalid');
    }

    const entities = this.scene.getEntities();
    if (!entities) {
      return;
    }

    for (const entity of entities) {
      if (!entity || !entity.enabled) continue;

      const meshRenderer = entity.getComponent('mesh-renderer') as MeshRenderer;
      if (meshRenderer && meshRenderer.enabled) {
        const bounds = meshRenderer.getBounds();
        if (bounds && frustum.intersects(bounds)) {
          this.renderQueue.push(meshRenderer);
          if (meshRenderer.castShadows) {
            this.shadowCasters.push(meshRenderer);
          }
        }
      }

      const light = entity.getComponent('light') as Light;
      if (light && light.enabled) {
        this.lights.push(light);
      }
    }
  }

  /**
   * Sorts mesh instances by material and mesh to optimize draw calls.
   * Groups by material first, then by mesh.
   */
  private sortMeshInstances(): void {
    if (!this.renderQueue || this.renderQueue.length === 0) {
      return;
    }

    this.renderQueue.sort((a, b) => {
      if (!a || !b) return 0;

      const materialA = a.getMaterial();
      const materialB = b.getMaterial();
      
      if (!materialA || !materialB) return 0;
      
      if (materialA.id !== materialB.id) {
        return materialA.id - materialB.id;
      }
      
      const meshA = a.getMesh();
      const meshB = b.getMesh();
      
      if (!meshA || !meshB) return 0;
      
      return meshA.id - meshB.id;
    });
  }

  /**
   * Dispatches global light uniforms to shaders.
   * Supports up to 4 directional lights and 8 point lights.
   */
  private dispatchGlobalLights(): void {
    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    const currentShader = this.getCurrentShader();
    if (!currentShader) {
      return;
    }

    let directionalLights = 0;
    let pointLights = 0;
    
    for (const light of this.lights) {
      if (!light) continue;

      if (light.type === 'directional' && directionalLights < this.MAX_DIRECTIONAL_LIGHTS) {
        const shader = light.getShader();
        const direction = light.getDirection();
        const color = light.getColor();
        const intensity = light.getIntensity();
        
        if (!direction || !color || intensity === undefined) {
          continue;
        }
        
        gl.uniform3fv(gl.getUniformLocation(shader, `uDirectionalLights[${directionalLights}].direction`), direction.data);
        gl.uniform3fv(gl.getUniformLocation(shader, `uDirectionalLights[${directionalLights}].color`), color.data);
        gl.uniform1f(gl.getUniformLocation(shader, `uDirectionalLights[${directionalLights}].intensity`), intensity);
        
        directionalLights++;
      } else if (light.type === 'point' && pointLights < this.MAX_POINT_LIGHTS) {
        const shader = light.getShader();
        const position = light.getPosition();
        const color = light.getColor();
        const intensity = light.getIntensity();
        const range = light.getRange();
        
        if (!position || !color || intensity === undefined || range === undefined) {
          continue;
        }
        
        gl.uniform3fv(gl.getUniformLocation(shader, `uPointLights[${pointLights}].position`), position.data);
        gl.uniform3fv(gl.getUniformLocation(shader, `uPointLights[${pointLights}].color`), color.data);
        gl.uniform1f(gl.getUniformLocation(shader, `uPointLights[${pointLights}].intensity`), intensity);
        gl.uniform1f(gl.getUniformLocation(shader, `uPointLights[${pointLights}].range`), range);
        
        pointLights++;
      }
    }
    
    gl.uniform1i(gl.getUniformLocation(currentShader, 'uDirectionalLightCount'), directionalLights);
    gl.uniform1i(gl.getUniformLocation(currentShader, 'uPointLightCount'), pointLights);
  }

  /**
   * Renders shadow maps for directional lights that cast shadows.
   */
  private renderShadows(): void {
    if (!this.shadowCasters || this.shadowCasters.length === 0) return;

    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    for (const light of this.lights) {
      if (!light || !light.castShadows || light.type !== 'directional') {
        continue;
      }

      const shadowMap = light.getShadowMap();
      if (!shadowMap) {
        continue;
      }

      device.setRenderTarget(shadowMap);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      
      const shadowShader = light.getShadowShader();
      if (!shadowShader) {
        continue;
      }
      
      gl.useProgram(shadowShader);
      
      for (const caster of this.shadowCasters) {
        if (!caster) continue;
        this.drawInstance(caster, shadowShader, true);
      }
    }
  }

  /**
   * Performs forward rendering pass for all visible objects.
   */
  private renderForward(): void {
    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    if (!this.camera) {
      throw new Error('Camera not set');
    }

    const renderTarget = this.camera.getRenderTarget();
    device.setRenderTarget(renderTarget || null);
    
    const clearColor = this.camera.getClearColor();
    if (!clearColor) {
      throw new Error('Camera clear color is invalid');
    }
    
    gl.clearColor(clearColor.x, clearColor.y, clearColor.z, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.textureUnitCounter = 0;

    for (const meshRenderer of this.renderQueue) {
      if (!meshRenderer) continue;

      const material = meshRenderer.getMaterial();
      if (!material) {
        continue;
      }

      const shader = material.getShader();
      if (!shader) {
        continue;
      }
      
      gl.useProgram(shader);
      
      this.setCamera(shader);
      this.dispatchGlobalLights();
      
      this.drawInstance(meshRenderer, shader, false);
    }
  }

  /**
   * Draws a single mesh instance.
   * @param meshRenderer - The mesh renderer to draw
   * @param shader - The shader program to use
   * @param isShadowPass - Whether this is a shadow pass
   */
  private drawInstance(meshRenderer: MeshRenderer, shader: WebGLProgram, isShadowPass: boolean): void {
    if (!meshRenderer || !shader) {
      return;
    }

    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    const worldMatrix = meshRenderer.getWorldMatrix();
    if (!worldMatrix) {
      throw new Error('World matrix is invalid');
    }

    const normalMatrix = new Mat3();
    normalMatrix.setFromMat4(worldMatrix);
    normalMatrix.invert();
    normalMatrix.transpose();

    if (!isShadowPass) {
      gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'uModelMatrix'), false, worldMatrix.data);
      gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'uNormalMatrix'), false, normalMatrix.data);
      
      const material = meshRenderer.getMaterial();
      if (!material) {
        throw new Error('Material is invalid');
      }
      
      const parameters = material.getParameters();
      if (!parameters) {
        throw new Error('Material parameters are invalid');
      }
      
      for (const [name, value] of parameters) {
        if (name === undefined || value === undefined) continue;
        
        const location = gl.getUniformLocation(shader, name);
        if (!location) continue;
        
        if (value instanceof Vec3) {
          gl.uniform3fv(location, value.data);
        } else if (value instanceof Color) {
          gl.uniform3fv(location, value.data);
        } else if (typeof value === 'number') {
          gl.uniform1f(location, value);
        } else if (value instanceof Texture) {
          const textureUnit = this.getTextureUnit(name);
          gl.activeTexture(gl.TEXTURE0 + textureUnit);
          gl.bindTexture(gl.TEXTURE_2D, (value as any).getGLTexture());
          gl.uniform1i(location, textureUnit);
        }
      }
    } else {
      gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'uModelMatrix'), false, worldMatrix.data);
    }

    const mesh = meshRenderer.getMesh();
    if (!mesh) {
      throw new Error('Mesh is invalid');
    }

    const vertexBuffer = mesh.getVertexBuffer();
    const indexBuffer = mesh.getIndexBuffer();
    
    if (!vertexBuffer || !indexBuffer) {
      throw new Error('Vertex or index buffer is invalid');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, (vertexBuffer as any).getGLBuffer());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, (indexBuffer as any).getGLBuffer());

    const vertexFormat = mesh.getVertexFormat();
    if (!vertexFormat) {
      throw new Error('Vertex format is invalid');
    }
    
    const elements = vertexFormat.getElements();
    if (!elements) {
      throw new Error('Vertex elements are invalid');
    }

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!element) continue;
      
      const location = gl.getAttribLocation(shader, element.name);
      if (location === -1) continue;
      
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        element.numComponents,
        gl.FLOAT,
        false,
        vertexFormat.getStride(),
        element.offset
      );
    }

    gl.drawElements(
      gl.TRIANGLES,
      indexBuffer.getIndexCount(),
      gl.UNSIGNED_SHORT,
      0
    );

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!element) continue;
      
      const location = gl.getAttribLocation(shader, element.name);
      if (location === -1) continue;
      
      gl.disableVertexAttribArray(location);
    }
  }

  /**
   * Sets camera uniforms in the shader.
   * @param shader - The shader program
   */
  private setCamera(shader: WebGLProgram): void {
    if (!this.camera || !shader) {
      return;
    }

    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    const viewMatrix = this.camera.getViewMatrix();
    const projectionMatrix = this.camera.getProjectionMatrix();
    
    if (!viewMatrix || !projectionMatrix) {
      throw new Error('View or projection matrix is invalid');
    }
    
    const viewProjectionMatrix = new Mat4();
    viewProjectionMatrix.mul2(projectionMatrix, viewMatrix);

    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'uViewMatrix'), false, viewMatrix.data);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'uProjectionMatrix'), false, projectionMatrix.data);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'uViewProjectionMatrix'), false, viewProjectionMatrix.data);
    
    const cameraPosition = this.camera.getPosition();
    if (!cameraPosition) {
      throw new Error('Camera position is invalid');
    }
    
    gl.uniform3fv(gl.getUniformLocation(shader, 'uCameraPosition'), cameraPosition.data);
  }

  /**
   * Gets the currently active shader program.
   * @returns The current WebGL program
   */
  private getCurrentShader(): WebGLProgram {
    const device = this.graphicsDevice as WebGLDevice;
    if (!device) {
      throw new Error('Graphics device is not WebGLDevice');
    }

    const gl = device.getContext();
    if (!gl) {
      throw new Error('WebGL context is invalid');
    }

    const currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    return currentProgram;
  }

  /**
   * Gets the texture unit for a given texture uniform name.
   * @param name - The texture uniform name
   * @returns The texture unit index
   */
  private getTextureUnit(name: string): number {
    if (!name) {
      throw new Error('Texture name cannot be empty');
    }

    const units = ['uDiffuseMap', 'uNormalMap', 'uSpecularMap', 'uEmissiveMap'];
    const index = units.indexOf(name);
    
    if (index === -1) {
      return this.textureUnitCounter++;
    }
    
    return index;
  }

  /**
   * Gets the current render queue.
   * @returns Array of mesh renderers
   */
  getRenderQueue(): MeshRenderer[] {
    return [...this.renderQueue];
  }

  /**
   * Gets the current shadow casters.
   * @returns Array of shadow casting mesh renderers
   */
  getShadowCasters(): MeshRenderer[] {
    return [...this.shadowCasters];
  }

  /**
   * Gets the current lights.
   * @returns Array of lights
   */
  getLights(): Light[] {
    return [...this.lights];
  }

  /**
   * Resets the renderer state.
   */
  reset(): void {
    this.camera = null;
    this.renderQueue.length = 0;
    this.shadowCasters.length = 0;
    this.lights.length = 0;
    this.textureUnitCounter = 0;
  }
}