/**
 * Experiment variant definition
 */
export interface VariantConfig {
  id: string;
  name: string;
  weight: number;
  payload: Record<string, any>;
}

export namespace VariantConfig {
  /**
   * Adjusts the weights of the provided variants so that they sum to 1.
   * If the total weight is 0, no changes are made.
   *
   * @param variants - Array of variant configurations to normalize
   * @throws {TypeError} If variants is not an array
   * @throws {Error} If any variant is missing required properties
   */
  export function normalizeWeight(variants: VariantConfig[]): void {
    if (!Array.isArray(variants)) {
      throw new TypeError('Expected variants to be an array');
    }
    if (variants.length === 0) return;

    validateVariants(variants);

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return;

    for (const v of variants) {
      v.weight = v.weight / totalWeight;
    }
  }

  /**
   * Finds a variant by its unique identifier.
   *
   * @param variants - Array of variant configurations to search
   * @param id - The identifier of the variant to retrieve
   * @returns The matching variant or null if not found
   * @throws {TypeError} If variants is not an array or id is not a string
   */
  export function getById(variants: VariantConfig[], id: string): VariantConfig | null {
    if (!Array.isArray(variants)) {
      throw new TypeError('Expected variants to be an array');
    }
    if (typeof id !== 'string') {
      throw new TypeError('Expected id to be a string');
    }

    return variants.find(v => v.id === id) ?? null;
  }

  /**
   * Validates that every variant in the array has the required properties.
   *
   * @param variants - Array of variant configurations to validate
   * @throws {Error} If any variant is invalid
   */
  function validateVariants(variants: VariantConfig[]): void {
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      if (!variant || typeof variant !== 'object') {
        throw new Error(`Variant at index ${i} is not a valid object`);
      }
      if (typeof variant.id !== 'string' || !variant.id.trim()) {
        throw new Error(`Variant at index ${i} has an invalid or empty id`);
      }
      if (typeof variant.name !== 'string' || !variant.name.trim()) {
        throw new Error(`Variant at index ${i} has an invalid or empty name`);
      }
      if (typeof variant.weight !== 'number' || variant.weight < 0) {
        throw new Error(`Variant at index ${i} has an invalid weight (must be a non-negative number)`);
      }
      if (!variant.payload || typeof variant.payload !== 'object') {
        throw new Error(`Variant at index ${i} has an invalid payload (must be an object)`);
      }
    }
  }
}
