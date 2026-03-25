import { PatchError } from './patch-error';

/**
 * Raised when the patch text cannot be parsed.
 *
 * @public
 */
export class PatchParseError extends PatchError {
  constructor(message: string) {
    super(message);
    this.name = 'PatchParseError';
  }
}
