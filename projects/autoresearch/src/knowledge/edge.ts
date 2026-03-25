/**
 * Represents a directed connection between two Nodes in a KnowledgeGraph.
 */
export class Edge {
  private id: string;
  private sourceId: string;
  private targetId: string;
  private label: string;
  private weight: number;
  private metadata: Record<string, unknown>;

  /**
   * Creates an Edge instance.
   * @param id - Unique identifier for the edge.
   * @param sourceId - Identifier of the source node.
   * @param targetId - Identifier of the target node.
   * @param label - Label describing the relationship.
   * @param weight - Numeric weight of the edge (default: 1).
   * @throws {TypeError} If any required argument is missing or invalid.
   */
  constructor(
    id: string,
    sourceId: string,
    targetId: string,
    label: string,
    weight: number = 1
  ) {
    this.validateString(id, 'id');
    this.validateString(sourceId, 'sourceId');
    this.validateString(targetId, 'targetId');
    this.validateString(label, 'label');
    this.validateWeight(weight);

    this.id = id;
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.label = label;
    this.weight = weight;
    this.metadata = {};
  }

  /**
   * Returns the edge identifier.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Returns the source node identifier.
   */
  getSourceId(): string {
    return this.sourceId;
  }

  /**
   * Returns the target node identifier.
   */
  getTargetId(): string {
    return this.targetId;
  }

  /**
   * Returns the edge label.
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Updates the edge label.
   * @param label - New label value.
   * @throws {TypeError} If label is not a non-empty string.
   */
  setLabel(label: string): void {
    this.validateString(label, 'label');
    this.label = label;
  }

  /**
   * Returns the edge weight.
   */
  getWeight(): number {
    return this.weight;
  }

  /**
   * Updates the edge weight.
   * @param weight - New weight value.
   * @throws {TypeError} If weight is not a finite positive number.
   */
  setWeight(weight: number): void {
    this.validateWeight(weight);
    this.weight = weight;
  }

  /**
   * Returns a shallow copy of the metadata object.
   */
  getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  /**
   * Sets a metadata key-value pair.
   * @param key - Metadata key.
   * @param value - Metadata value.
   * @throws {TypeError} If key is not a non-empty string.
   */
  setMetadata(key: string, value: unknown): void {
    this.validateString(key, 'metadata key');
    this.metadata[key] = value;
  }

  /**
   * Validates that a value is a non-empty string.
   * @param value - Value to validate.
   * @param name - Parameter name for error messages.
   * @throws {TypeError} If validation fails.
   */
  private validateString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`${name} must be a non-empty string`);
    }
  }

  /**
   * Validates that a value is a finite positive number.
   * @param value - Value to validate.
   * @throws {TypeError} If validation fails.
   */
  private validateWeight(value: unknown): asserts value is number {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
      throw new TypeError('weight must be a finite positive number');
    }
  }
}
