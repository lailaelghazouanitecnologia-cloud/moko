/**
 * Axis-aligned rectangle for bounding boxes, selection areas, and map regions.
 */

import { Vector2 } from './Vector2';

export class Rectangle {
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /** Create from two corner points */
  static fromPoints(a: Vector2, b: Vector2): Rectangle {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x, b.x);
    const maxY = Math.max(a.y, b.y);
    return new Rectangle(minX, minY, maxX - minX, maxY - minY);
  }

  /** Create from center point and half-extents */
  static fromCenter(center: Vector2, halfWidth: number, halfHeight: number): Rectangle {
    return new Rectangle(
      center.x - halfWidth,
      center.y - halfHeight,
      halfWidth * 2,
      halfHeight * 2
    );
  }

  get left(): number { return this.x; }
  get top(): number { return this.y; }
  get right(): number { return this.x + this.width; }
  get bottom(): number { return this.y + this.height; }

  get center(): Vector2 {
    return new Vector2(this.x + this.width / 2, this.y + this.height / 2);
  }

  get topLeft(): Vector2 { return new Vector2(this.x, this.y); }
  get topRight(): Vector2 { return new Vector2(this.right, this.y); }
  get bottomLeft(): Vector2 { return new Vector2(this.x, this.bottom); }
  get bottomRight(): Vector2 { return new Vector2(this.right, this.bottom); }

  get area(): number { return this.width * this.height; }

  /** Check if a point is inside this rectangle */
  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.x &&
      point.x < this.right &&
      point.y >= this.y &&
      point.y < this.bottom
    );
  }

  /** Check if another rectangle overlaps with this one */
  intersects(other: Rectangle): boolean {
    return !(
      other.left >= this.right ||
      other.right <= this.left ||
      other.top >= this.bottom ||
      other.bottom <= this.top
    );
  }

  /** Return the intersection rectangle, or null if no overlap */
  intersection(other: Rectangle): Rectangle | null {
    const left = Math.max(this.left, other.left);
    const top = Math.max(this.top, other.top);
    const right = Math.min(this.right, other.right);
    const bottom = Math.min(this.bottom, other.bottom);

    if (right > left && bottom > top) {
      return new Rectangle(left, top, right - left, bottom - top);
    }
    return null;
  }

  /** Expand rectangle by a margin on all sides */
  expand(margin: number): Rectangle {
    return new Rectangle(
      this.x - margin,
      this.y - margin,
      this.width + margin * 2,
      this.height + margin * 2
    );
  }

  toString(): string {
    return `Rect(${this.x}, ${this.y}, ${this.width}x${this.height})`;
  }
}
