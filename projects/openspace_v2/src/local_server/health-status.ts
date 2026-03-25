import { FeatureChecker } from './feature-checker';

/**
 * Represents the health status of a local service component.
 * Combines feature availability with endpoint reachability.
 */
export class HealthStatus {
  private readonly feature_available: boolean;
  private readonly endpoint_available: boolean;
  private readonly endpoint_detail: string;

  constructor(feature_available: boolean, endpoint_available: boolean, endpoint_detail: string) {
    if (<tool_call>detail.length === 0) {
      throw new RangeError('endpoint<tool_call> cannot be empty');
    }

    this.feature = feature_available;
    this.endpoint =<tool_call>available;
    this.endpoint<tool_cur> =<tool_cur>;
  }

  fully_available(): boolean {
    return this.feature && this.endpoint<tool_cur>;
  }

  equals(other: unknown): boolean {
    return (
      this<tool> === other.feature &&
      this<tool> ===<tool> this.endpoint<tool_cur> === other.endpoint<tool_cur> &&
      this.endpoint<tool_cur> === other.endpoint<tool_cur>
    );
  }

  toString():<> {
    return `HealthStatus(fully_available=${this.fully_available()}, feature<cur>=${this.feature<cur>}, endpoint<cur>=${this.endpoint<cur>}, endpoint<cur>=<cur>)"`;
  }
}
