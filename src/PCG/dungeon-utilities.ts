import { DOWN, DOWN_LEFT, DOWN_RIGHT, LEFT, RIGHT, UP, UP_LEFT, UP_RIGHT, vAdd, vector, Vector, vInZeroedBounds } from "../engine";
import { Random } from "../Random";
import { GridTile } from "../Scene";
import { array } from "../util";

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

export const findOutline = (points: Vector[], grid?: Grid, bounds?: Vector): Vector[] => {
  let upper = vector();
  if (!bounds) {
    if (grid) {
      upper = getBoundsOfGrid(grid);
    } else {
      points.forEach(([x, y]) => {
        if (x > upper[0]) {
          upper[0] = x;
        }
        if (y > upper[1]) {
          upper[1] = y;
        }
      });
    }
  } else {
    upper = bounds;
  }

  let checkGrid: Grid = grid ? grid : array(upper[1] + 1, () => array(upper[0] + 1, () => 0));
  if (!grid) {
    points.forEach(p => {
      checkGrid[p[1]][p[0]] = 1;
    });
  }

  const outline: Vector[] = [];

  // Using hashmaps here is quicker than searching the array + vEqual each time
  const seenOutline: Record<string, true> = {};
  const seen: Record<string, true> = {};

  const outlineFill = (v: Vector, pv?: Vector) => {
    const key = v[0] + ',' + v[1];
    if (seen[key]) return;
    const pvKey = pv ? pv[0] + ',' + pv[1] : '_';

    if (vInZeroedBounds(upper, v) && checkGrid[v[1]][v[0]] === 1) {
      seen[key] = true;
      cardinals.forEach(d => outlineFill(vAdd(v, d), v));
    } else if (pv && !seenOutline[pvKey]) {
      outline.push(pv);
      seenOutline[pvKey] = true;
    }
  }
  outlineFill(points[0]);

  return outline;
}

export const findLargestRegionIndex = (regions: Region[]) => {
  let largestIndex = -1;
  let numCells = 0;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i].length > numCells) {
      numCells = regions[i].length;
      largestIndex = i;
    }
  }
  return largestIndex;
};

export const pointsToGrid = (points: Region): Grid => {
  const upper = vector();
  points.forEach(([x, y]) => {
    if (x > upper[0]) {
      upper[0] = x;
    }
    if (y > upper[1]) {
      upper[1] = y;
    }
  });

  const grid = array(upper[1] + 1, () => array(upper[0] + 1, () => 0));
  points.forEach(p => {
    grid[p[1]][p[0]] = 1;
  });

  return grid;
};

export const findNorthernPoints = (points: Vector[]) => {
  // Higher points are lower numbers in this coordinate system
  let lowestY = Infinity;
  let found: Vector[] = [];

  for (const p of points) {
    if (p[1] < lowestY) {
      // We found a new lowest point, remove the old points
      found = [p];
      lowestY = p[1];
    } else if (p[1] === lowestY) {
      // This is an equally low point
      found.push(p);
    }
  }

  return found;
};

export const findSouthernPoints = (points: Vector[]) => {
  let highest = -Infinity;
  let found: Vector[] = [];

  for (const p of points) {
    if (p[1] > highest) {
      found = [p];
      highest = p[1];
    } else if (p[1] === highest) {
      found.push(p);
    }
  }

  return found;
};

export const findWesternPoints = (points: Vector[]) => {
  let lowest = Infinity;
  let found: Vector[] = [];

  for (const p of points) {
    if (p[0] < lowest) {
      found = [p];
      lowest = p[0];
    } else if (p[0] === lowest) {
      found.push(p);
    }
  }

  return found;
};

export const findEasternPoints = (points: Vector[]) => {
  let highest = -Infinity;
  let found: Vector[] = [];

  for (const p of points) {
    if (p[0] > highest) {
      found = [p];
      highest = p[0];
    } else if (p[0] === highest) {
      found.push(p);
    }
  }

  return found;
};

export const generateExitsFromConnectableEdges = (connectableEdges: ConnectableEdges, random: Random) => {
  const exits: Exit[] = [];
  Object.entries(connectableEdges).forEach(([cardinal, points]) => {
    // Generate for this cardinal?
    if (points.length > 0 && random.bool()) {
      exits.push({ position: random.choose(points), cardinal: cardinal as unknown as Cardinal });
    }
  });
  return exits;
}

export const lineBetween = ([px1, py1]: Vector, [px2, py2]: Vector) => {
  // The relative distance in both axes
  const dx = px2 - px1;
  const dy = py2 - py1;

  // The absolute distance
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);

  // The direction of travel in both axes
  const signX = dx > 0 ? 1 : -1;
  const signY = dy > 0 ? 1 : -1;

  const points: Vector[] = [[px1, py1]];

  let p: Vector = [px1, py1];
  let ix = 0;
  let iy = 0;

  const nudgeSize = 0.5;

  while (ix < nx || iy < ny) {
      const xStep = (nudgeSize + ix) / nx;
      const yStep = (nudgeSize + iy) / ny;

      if (xStep < yStep) {
          // We have further to go in x, take a step in the x direction
          p[0] += signX;
          ix++;
      } else {
          // We have further to go in y, take a step in the y direction
          p[1] += signY;
          iy++;
      }
      points.push([...p]);
  }

  return points;
};

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
