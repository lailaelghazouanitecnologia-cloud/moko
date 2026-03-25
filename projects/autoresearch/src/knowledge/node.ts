/**
 * Represents a single fact or entity in the knowledge graph.
 */
export class Node {
  private id: string;
  private label: string;
  private properties: Map<string, any>;

  /**
   * Creates a new Node instance.
   * @param id - Unique identifier for the node.
   * @param label - Human-readable label for the node.
   * @throws {TypeError} If id or label is not a non-empty string.
   */
  constructor(id: string, label: string) {
    this.validateString(id, 'id');
    this.validateString(label, 'label');
    this.id = id;
    this.label = label;
    this.properties = new Map<string, any>();
  }

  /**
   * Returns the unique identifier of the node.
   * @returns The node id.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Returns the label of the node.
   * @returns The node label.
   */
  getLabel(): string {
    return this.label;
  }

  /**
   * Updates the label of the node.
   * @param label - The new label for the node.
   * @throws {TypeError} If label is not a non-empty string.
   */
  setLabel(label: string): void {
    this.validateString(label, 'label');
    this.label = label;
  }

  /**
   * Retrieves the value of a property by its key.
   * @param key - The property key.
   * @returns The property value, or undefined if the property does not exist.
   * @throws {TypeError} If key is not a non-empty string.
   */
  getProperty(key: string): any {
    this.validateString(key, 'key');
    return this.properties.get(key);
  }

  /**
   * Sets or updates a property value.
   * @param key - The property key.
   * @param value - The value to set.
   * @throws {TypeError} If key is not a non-empty string.
   */
  setProperty(key: string, value: any): void {
    this.validateString(key, 'key');
    this.properties.set(key, value);
  }

  /**
   * Checks whether a property exists.
   * @param key - The property key.
   * @returns True if the property exists, false otherwise.
   * @throws {TypeError} If key is not a non-empty string.
   */
  hasProperty(key: string): boolean {
    this.validateString(key, 'key');
    return this.properties.has(key);
  }

  /**
   * Removes a property.
   * @param key - The property key.
   * @returns True if the property existed and was removed, false otherwise.
   * @throws {TypeError} If key is not a non-empty string.
   */
  removeProperty(key: string): boolean {
    this.validateString(key, 'key');
    return this.properties.delete(key);
  }

  /**
   * Returns a shallow copy of all properties.
   * @returns A new Map containing all properties.
   */
  getProperties(): Map<string, any> {
    return new Map(this.properties);
  }

  /**
   * Serializes the node to a plain object.
   * @returns An object representation of the node.
   */
  toJSON(): object {
    const props: Record<string, any> = {};
    this.properties.forEach((value, key) => {
      props[key] = value;
    });
    return {
      id: this.id,
      label: this.label,
      properties: props
    };
  }

  /**
   * Validates that a value is a non-empty string.
   * @param value - The value to validate.
   * @param name - The name of the parameter for error messages.
   * @throws {TypeError} If value is not a non-empty string.
   */
  private validateString(value: unknown, name: string): asserts value is string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`${name} must be a non-empty string`);
    }
  }
}
