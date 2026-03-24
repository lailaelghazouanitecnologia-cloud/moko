import { VertexFormat } from './vertex-format';
import { IndexFormat } from './index-format';
import { PixelFormat } from './pixel-format';
import { Color } from '../math/color';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { Texture } from './texture';
import { RenderTarget } from './render-target';
import { Shader } from './shader';
import { Material } from './material';
import { Mesh } from './mesh';

/**
 * Abstraction layer for low-level GPU operations.
 * Provides methods to create and manage GPU resources such as buffers, textures,
 * shaders, and render targets, as well as perform rendering operations.
 */
export interface GraphicsDevice {
  /**
   * Allocates a GPU vertex buffer with the specified format and vertex count.
   * @param format - The format of the vertex data (e.g., position, color, uv).
   * @param count - Number of vertices to allocate.
   * @returns A new VertexBuffer instance.
   * @throws {TypeError} If format is not a valid VertexFormat.
   * @throws {RangeError} If count is not a positive integer.
   */
  createVertexBuffer(format: VertexFormat, count: number): VertexBuffer;

  /**
   * Allocates a GPU index buffer with the specified format and index count.
   * @param format - The format of the index data (e.g., uint16, uint32).
   * @param count - Number of indices to allocate.
   * @returns A new IndexBuffer instance.
   * @throws {TypeError} If format is not a valid IndexFormat.
   * @throws {RangeError} If count is not a positive integer.
   */
  createIndexBuffer(format: IndexFormat, count: number): IndexBuffer;

  /**
   * Allocates a GPU texture with the specified dimensions and pixel format.
   * @param width - Width of the texture in pixels.
   * @param height - Height of the texture in pixels.
   * @param format - The pixel format (e.g., RGBA8, RGBA32F).
   * @returns A new Texture instance.
   * @throws {RangeError} If width or height is not a positive integer.
   * @throws {TypeError} If format is not a valid PixelFormat.
   */
  createTexture(width: number, height: number, format: PixelFormat): Texture;

  /**
   * Creates a render target (framebuffer) with the provided color texture and optional depth texture.
   * @param color - The color texture to render into.
   *  @param depth - Optional depth/stencil texture for depth testing.
   * @returns A new RenderTarget instance.
   * @throws {TypeError} If color is not a valid Texture.
   * @throws {Error} If color is already used in another render target.
   */
  createRenderTarget(color: Texture, depth?: Texture): RenderTarget;

  /**
   * Compiles a shader program from vertex and fragment shader source code.
   * @param vertexSrc - GLSL source code for the vertex shader.
   * @param fragmentSrc - GLSL source code for the fragment shader.
   * @returns A new Shader instance.
   * @throws {TypeError} If vertexSrc or fragmentSrc is not a string.
   * @throws {Error} If shader compilation or linking fails.
   */
  createShader(vertexSrc: string, fragmentSrc: string): Shader;

  /**
   * Binds a render target for subsequent draw calls.
   * @param target - The render target to bind. If undefined, binds the default framebuffer.
   * @returns void
   * @throws {TypeError} If target is not a valid RenderTarget.
   */
  setRenderTarget(target?: RenderTarget): void;

  /**
   * Cleys the currently bound framebuffer.
   * @param color - Optional color to clear the color buffer.
   * @param depth - Optional depth value to clear the depth buffer.
   * @param stencil - Optional stencil value to clear the stencil buffer.
   * @returns void
   * @throws {RangeError} If depth or stencil is out of range.
   */
  clear(color?: Color, depth?: number, stencil?: number): void;

  /**
   * Renders a mesh using the provided material.
   * @param mesh - The mesh to render.
   * @param material - The material to apply.
   * @returns void
   * @throws {TypeError} If mesh or material is invalid.
   * @throws {Error} If the required vertex attributes are not provided by the mesh.
   */
  draw(mesh: Mesh, material: Material): void;

  /**
   * Sets the viewport rectangle for rendering.
   * @param x - The x-coordinate of the viewport’s lower-left corner.
   * @param y - The y-coordinate of the viewport’s lower-left corner.
   * @param w - Width of the viewport in pixels.
   * @param h - Height of the viewport in pixels.
   * @returns void
   * @throws {RangeError} If w or h is not a positive integer.
   */
  setViewport(x: number, y: number, w: number, h: number): void;

  /**
   * Reads pixel data from the currently bound framebuffer.
   * @param x - The x-coordinate of the rectangle to read.
   * @param y - The y-coordinate of the rectangle to read.
   * @param w - Width of the rectangle in pixels.
   * @param h - Height of the rectangle in pixels.
   * @returns A Uint8Array containing RGBA pixel data.
   * @throws {RangeError} If x, y, w, or h is out of bounds.
   * @throws {Error} If the read operation fails (e.g., framebuffer incomplete).
   */
  readPixels(x: number, y: number, w: number, h: number): Uint8Array;
}
