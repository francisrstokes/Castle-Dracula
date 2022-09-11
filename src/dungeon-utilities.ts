import { DOWN, DOWN_LEFT, DOWN_RIGHT, LEFT, RIGHT, UP, UP_LEFT, UP_RIGHT, vAdd, Vector, vInZeroedBounds } from "./engine";
import { GridTile } from "./Scene";

export enum Cardinal {
  North = 'North',
  South = 'South',
  East = 'East',
  West = 'West',
}

export type Exit = {
  cardinal: Cardinal;
  position: Vector;
};

export type RoomConnection = {
  roomAIndex: number;
  roomBIndex: number;
  roomA: Room;
  roomB: Room;
  exitPosition: Vector;
};

export type ConnectableEdges = Record<Cardinal, Vector[]>;

export type Room = {
  tiles: GridTile[];
  exits: Exit[];
  outline: Vector[];
  connectableEdges: ConnectableEdges;
  maxWidth: number;
  maxHeight: number;
};

export type Grid<T = number> = T[][];

export type Region = Vector[];


export const getOppositeCardinal = (c: Cardinal): Cardinal => {
  switch (c) {
    case Cardinal.North: return Cardinal.South;
    case Cardinal.East: return Cardinal.West;
    case Cardinal.West: return Cardinal.East;
    case Cardinal.South: return Cardinal.North;
  }
}

export const directions = [
  UP_LEFT,    UP,     UP_RIGHT,
  LEFT,               RIGHT,
  DOWN_LEFT,  DOWN,   DOWN_RIGHT
];

export const cardinals = [UP, LEFT, RIGHT, DOWN];

export const cloneGrid = (grid: Grid) => grid.map(row => row.slice());

export const getBoundsOfGrid = (grid: Grid): Vector => [grid[0].length - 1, grid.length - 1];

export const getGridNeighbourCount = (p: Vector, grid: Grid, metric = directions) => {
  let count = 0;
  const rowSize = grid[0].length;
  const colSize = grid.length;
  metric.forEach(d => {
    const [x, y] = vAdd(p, d);
    if (x >= 0 && x < rowSize && y >= 0 && y < colSize) {
      count += grid[y][x];
    }
  });
  return count;
}

export type FloodOpts = Partial<{
  neighbourhood: Vector[]
}>;
export const flood = (grid: Grid, point: Vector, opts?: FloodOpts) => {
  const gridUpperBound: Vector = [grid[0].length - 1, grid.length - 1];
  const collected: Vector[] = [];

  const neighbourhood = opts?.neighbourhood ?? directions;

  const seen: Record<string, true> = {};

  const floodFill = (v: Vector) => {
    const key = v[0] + ',' + v[1];
    if (seen[key] || !vInZeroedBounds(gridUpperBound, v)) return;

    if (grid[v[1]][v[0]] === 1) {
      collected.push(v);
      seen[key] = true;
      for (const d of neighbourhood) {
        floodFill(vAdd(v, d));
      }
    }
  }

  floodFill(point);
  return collected;
}

export const findRegionsInGrid = (grid: Grid): Vector[][] => {
  const regions: Vector[][] = [];
  const workingGrid = cloneGrid(grid);

  for (let y = 0; y < workingGrid.length; y++) {
    for (let x = 0; x < workingGrid[0].length; x++) {
      // Fill from the current point
      const region = flood(workingGrid, [x, y], { neighbourhood: cardinals });

      // Did we find a region?
      if (region.length > 0) {
        // Add it to the region list
        regions.push(region);

        // Remove the nodes we found from the working grid
        region.forEach(([x, y]) => {
          workingGrid[y][x] = 0;
        });
      }
    }
  }

  return regions;
}

export const findMaxWidthAndHeight = (points: Vector[]): Vector => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return [maxX - minX, maxY - minY];
};
