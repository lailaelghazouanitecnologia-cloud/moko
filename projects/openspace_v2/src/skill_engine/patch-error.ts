import { RuntimeError } from '../utils';

export type PatchType =
  | 'add'
  | 'remove'
  | 'replace'
  | 'move'
  | 'copy'
  | 'test';

/**
 * Raised when a patch cannot be applied.
 *
 * @example
 * ```ts
 * throw new PatchError('Cannot apply patch', 'replace');
 * ```
 */
export class PatchError extends RuntimeError {
  constructor(message: string, public readonly patchType?: PatchType) {
    super(message);
    this.name = 'PatchError';

    // Ensure the message is a string

    // Ensure the patchType is one of the valid PatchType literals
    if (
      patchType !== undefined &&
      !['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(patchType)
    ) {
      throw new RangeError(`Invalid patchType: ${patchType}`);
    }
  }
}
