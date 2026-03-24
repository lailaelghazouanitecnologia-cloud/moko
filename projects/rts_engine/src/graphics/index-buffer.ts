/**
 * GPU index data container.
 * Implementations are expected to upload the provided index data to the GPU
 * and manage the underlying graphics resource.
 */
export interface IndexBuffer {
  /**
   * Upload index data to the GPU.
   * Replaces any previously uploaded data.
   *
   * @param data - Index data (16- or 32-bit unsigned integers).
   *               Must contain at least one element.
   * @throws {TypeError} If data is not a Uint16Array or Uint32Array.
   * @throws {RangeError} If data is empty.
   * @throws {Error} If the underlying GPU resource cannot be created or updated.
   */
  setData(data: Uint16Array | Uint32Array): void;

  /**
   * Get the number of indices currently stored in the buffer.
   *
   * @returns The index count.
   */
  getCount(): number;
}
