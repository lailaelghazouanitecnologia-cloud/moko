/**
 * A* pathfinding implementation on a 2D grid.
 *
 * Algorithm overview:
 * 1. Maintain an open set (min-heap by f-score) and a closed set.
 * 2. For each node, f(n) = g(n) + h(n), where:
 *    - g(n) = cheapest known cost from start to n
 *    - h(n) = heuristic estimate from n to goal (octile distance)
 * 3. Expand the lowest-f node, updating neighbors if a cheaper path is found.
 * 4. Repeat until goal is reached or open set is empty.
 *
 * Uses octile distance heuristic for 8-directional movement to ensure
 * admissibility (never overestimates) and consistency.
 */

import { Vector2 } from './Vector2';
import { Grid } from './Grid';

/** Result of a pathfinding query */
export interface PathResult {
  /** Ordered waypoints from start to goal (inclusive) */
  readonly path: readonly Vector2[];
  /** Total movement cost of the path */
  readonly cost: number;
  /** Whether a path was found */
  readonly found: boolean;
  /** Number of nodes explored during the search */
  readonly nodesExplored: number;
}

/** Cost function: returns the movement cost to enter a tile, or Infinity if impassable */
export type CostFunction = (x: number, y: number) => number;

/** Internal node used during A* search */
interface AStarNode {
  x: number;
  y: number;
  g: number;       // Cost from start
  f: number;       // g + heuristic
  parentX: number; // -1 means no parent (start node)
  parentY: number;
  closed: boolean;
  opened: boolean;
}

const SQRT2 = Math.SQRT2;

/**
 * Octile distance heuristic for 8-directional grids.
 * This is admissible and consistent for grids where diagonal moves cost sqrt(2).
 */
function octileDistance(x0: number, y0: number, x1: number, y1: number): number {
  const dx = Math.abs(x0 - x1);
  const dy = Math.abs(y0 - y1);
  return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
}

/**
 * Simple binary min-heap for the open set, keyed on f-score.
 * Much faster than a sorted array for large grids.
 */
class MinHeap {
  private readonly _data: AStarNode[] = [];

  get length(): number {
    return this._data.length;
  }

  push(node: AStarNode): void {
    this._data.push(node);
    this._bubbleUp(this._data.length - 1);
  }

  pop(): AStarNode | undefined {
    const data = this._data;
    if (data.length === 0) return undefined;
    const top = data[0];
    const last = data.pop()!;
    if (data.length > 0) {
      data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  /** Re-heapify after a node's f-score decreases */
  decreaseKey(node: AStarNode): void {
    const idx = this._data.indexOf(node);
    if (idx >= 0) {
      this._bubbleUp(idx);
    }
  }

  private _bubbleUp(idx: number): void {
    const data = this._data;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (data[idx].f < data[parent].f) {
        [data[idx], data[parent]] = [data[parent], data[idx]];
        idx = parent;
      } else {
        break;
      }
    }
  }

  private _sinkDown(idx: number): void {
    const data = this._data;
    const len = data.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < len && data[left].f < data[smallest].f) smallest = left;
      if (right < len && data[right].f < data[smallest].f) smallest = right;
      if (smallest !== idx) {
        [data[idx], data[smallest]] = [data[smallest], data[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

/**
 * 8-directional movement offsets: cardinals cost 1.0, diagonals cost sqrt(2).
 */
const DIRECTIONS: ReadonlyArray<{ dx: number; dy: number; cost: number }> = [
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: -1, cost: SQRT2 },
  { dx: 1, dy: 0, cost: 1 },
  { dx: 1, dy: 1, cost: SQRT2 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: -1, dy: 1, cost: SQRT2 },
  { dx: -1, dy: 0, cost: 1 },
  { dx: -1, dy: -1, cost: SQRT2 },
];

/**
 * Find the shortest path from start to goal on a grid using A*.
 *
 * @param gridWidth - Width of the grid
 * @param gridHeight - Height of the grid
 * @param start - Starting position (integer coordinates)
 * @param goal - Goal position (integer coordinates)
 * @param costFn - Returns movement cost for a tile, or Infinity for impassable
 * @param maxIterations - Safety limit to prevent runaway searches (default 10000)
 */
export function findPath(
  gridWidth: number,
  gridHeight: number,
  start: Vector2,
  goal: Vector2,
  costFn: CostFunction,
  maxIterations: number = 10000
): PathResult {
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);

  // Quick bail-outs
  if (sx === gx && sy === gy) {
    return { path: [start], cost: 0, found: true, nodesExplored: 0 };
  }

  if (
    sx < 0 || sx >= gridWidth || sy < 0 || sy >= gridHeight ||
    gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight
  ) {
    return { path: [], cost: 0, found: false, nodesExplored: 0 };
  }

  if (!isFinite(costFn(gx, gy))) {
    return { path: [], cost: 0, found: false, nodesExplored: 0 };
  }

  // Node grid (lazily created per cell)
  const nodes = new Grid<AStarNode | null>(gridWidth, gridHeight, null);

  const startNode: AStarNode = {
    x: sx, y: sy,
    g: 0,
    f: octileDistance(sx, sy, gx, gy),
    parentX: -1, parentY: -1,
    closed: false, opened: true,
  };
  nodes.set(sx, sy, startNode);

  const openSet = new MinHeap();
  openSet.push(startNode);

  let explored = 0;

  while (openSet.length > 0 && explored < maxIterations) {
    const current = openSet.pop()!;
    explored++;

    // Goal reached — reconstruct path
    if (current.x === gx && current.y === gy) {
      return {
        path: reconstructPath(nodes, current),
        cost: current.g,
        found: true,
        nodesExplored: explored,
      };
    }

    current.closed = true;

    // Expand neighbors
    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

      const tileCost = costFn(nx, ny);
      if (!isFinite(tileCost)) continue; // Impassable

      // Diagonal movement: block if either adjacent cardinal is impassable
      // This prevents "corner cutting" through walls
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (!isFinite(costFn(current.x + dir.dx, current.y)) ||
            !isFinite(costFn(current.x, current.y + dir.dy))) {
          continue;
        }
      }

      let neighbor = nodes.get(nx, ny);
      if (neighbor && neighbor.closed) continue;

      const tentativeG = current.g + dir.cost * tileCost;

      if (!neighbor) {
        neighbor = {
          x: nx, y: ny,
          g: tentativeG,
          f: tentativeG + octileDistance(nx, ny, gx, gy),
          parentX: current.x, parentY: current.y,
          closed: false, opened: true,
        };
        nodes.set(nx, ny, neighbor);
        openSet.push(neighbor);
      } else if (tentativeG < neighbor.g) {
        // Found a cheaper route to this neighbor
        neighbor.g = tentativeG;
        neighbor.f = tentativeG + octileDistance(nx, ny, gx, gy);
        neighbor.parentX = current.x;
        neighbor.parentY = current.y;
        openSet.decreaseKey(neighbor);
      }
    }
  }

  // No path found
  return { path: [], cost: 0, found: false, nodesExplored: explored };
}

/** Reconstruct the path by walking parent pointers back to start */
function reconstructPath(nodes: Grid<AStarNode | null>, end: AStarNode): Vector2[] {
  const path: Vector2[] = [];
  let current: AStarNode | null = end;

  while (current !== null) {
    path.push(new Vector2(current.x, current.y));
    if (current.parentX === -1) break;
    current = nodes.get(current.parentX, current.parentY) ?? null;
  }

  path.reverse();
  return path;
}
