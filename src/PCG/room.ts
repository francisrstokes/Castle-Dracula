import { Layers, vAdd, vContains, vDist, Vector, vEqual, vInZeroedBounds } from "../engine";
import { Random } from "../Random";
import { array } from "../util";
import {environment as E} from '../environment'
import { Grid, Room, findOutline, cardinals, findRegionsInGrid, findLargestRegionIndex, pointsToGrid, flood, Cardinal, findNorthernPoints, findSouthernPoints, findEasternPoints, findWesternPoints, ConnectableEdges, generateExitsFromConnectableEdges, getGridNeighbourCount, Exit } from "./dungeon-utilities";
import { GridTile } from "../Scene";

export const generateBiteRoom = (random: Random): Room => {
  const height = random.intBetween(8, 16);
  const width = random.intBetween(8, 16);

  let points: Vector[] = [];
  const grid: Grid = array(height, () => array(width, () => 0));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      points.push([x, y]);
      grid[y][x] = 1;
    }
  }

  let outline = findOutline(points, grid);
  let P = random.choose(outline);

  const tilesToEat = random.intBetween(5, (height*width) >> 1);
  let tilesEaten = 0;

  while (tilesEaten < tilesToEat) {
    const toEatThisRound = Math.min(tilesToEat-tilesEaten, random.intBetween(1, 10));
    for (let i = 0; i < toEatThisRound; i++) {
      // Eat this point
      points = points.filter(p => !vEqual(p, P));
      // Remove this point from the outline
      outline = outline.filter(p => !vEqual(p, P));

      grid[P[1]][P[0]] = 0;
      // Increment the counter
      tilesEaten++;
      // Select the next point to be eaten (if one can be found)
      let found = false;
      for (const C of random.shuffle(cardinals)) {
        const nextP = vAdd(P, C);
        if (vInZeroedBounds([width-1, height-1], nextP) && grid[nextP[1]][nextP[0]] === 1) {
          P = nextP;
          found = true;
          break;
        }
      }

      if (!found) break;
    }

    if (outline.length === 0) break;

    // Choose a random point on the outline
    P = random.choose(outline);
  }

  // Recompute the outline
  outline = findOutline(points);

  // Flood fill to find the unconnected regions
  const regions = findRegionsInGrid(grid);
  const largestIndex = findLargestRegionIndex(regions);
  const [largest] = regions.splice(largestIndex, 1);

  const withoutOutline = largest.filter(v => !vContains(outline, v));

  // Remove any hanging sections in the outline
  const hangingWallTiles: Vector[] = [];
  outline.forEach(ov => {
    const withOv = [...withoutOutline, ov];
    const grid = pointsToGrid(withOv);
    const result = flood(grid, ov, {neighbourhood: cardinals});
    if (result.length !== withoutOutline.length + 1) {
      hangingWallTiles.push(ov);
    }
  });

  outline = outline.filter(op => !vContains(hangingWallTiles, op));
  points = outline.concat(withoutOutline);

  // TODO: This is really just a hack. Some (relatively small) amount of the time,
  // the outline is not properly computed. This can be detected by checking the outline
  // the total number of points, and then just recompute the whole thing.
  const ratio = outline.length / points.length
  if (ratio < 0.2) {
    return generateBiteRoom(random);
  }

  const connectableEdges: ConnectableEdges = {
    [Cardinal.North]: findNorthernPoints(outline),
    [Cardinal.South]: findSouthernPoints(outline),
    [Cardinal.East]: findEasternPoints(outline),
    [Cardinal.West]: findWesternPoints(outline),
  };

  return {
    exits: generateExitsFromConnectableEdges(connectableEdges, random),
    maxHeight: height,
    maxWidth: width,
    outline,
    connectableEdges,
    tiles: points.map(p => ({
      position: p,
      env: vContains(outline, p)
        ? E.Wall
        : E.Floor,
      zPos: Layers.BG
    }))
  };
};

export const generateCircleRoom = (random: Random): Room => {
  const radius = random.intBetween(4, 15, 3);
  const center: Vector = [radius, radius];
  const points: Vector[] = [];

  const innerRadius = random.intBetween(2, radius / 2);
  const createHole = radius > 6 && random.bool();

  for (let y = 0; y < radius*2; y++) {
    for (let x = 0; x < radius*2; x++) {
      const dist = vDist(center, [x, y]);
      if (dist < radius) {
        if (!(createHole && dist <= innerRadius)) {
          points.push([x, y]);
        }
      }
    }
  }

  const outline = findOutline(points);
  const outlineGrid = pointsToGrid(outline);

  const canConnectToPoint = (v: Vector) => getGridNeighbourCount(v, outlineGrid, cardinals) >= 1;

  const connectableEdges: ConnectableEdges = {
    [Cardinal.North]: findNorthernPoints(outline).filter(canConnectToPoint),
    [Cardinal.South]: findSouthernPoints(outline).filter(canConnectToPoint),
    [Cardinal.East]: findEasternPoints(outline).filter(canConnectToPoint),
    [Cardinal.West]: findWesternPoints(outline).filter(canConnectToPoint),
  };

  const tiles: GridTile[] = points.map(p => ({
    position: p,
    env: vContains(outline, p)
      ? E.Wall
      : E.Floor,
    zPos: Layers.BG
  }));

  return {
    exits: generateExitsFromConnectableEdges(connectableEdges, random),
    outline,
    connectableEdges,
    maxHeight: radius*2,
    maxWidth: radius*2,
    tiles
  }
};

export const generateRectRoom = (random: Random): Room => {
  const height = random.intBetween(4, 16, 3.4);
  const width = random.intBetween(4, 26, 1.6);
  const outline: Vector[] = [];
  const points: Vector[] = [];

  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      const isOutline = (
        ((x === 0 || x === width) || (y === 0 || y === height))
      );
      if (isOutline) {
        outline.push([x, y]);
      }
      points.push([x, y]);
    }
  }

  const isCornerPoint = ([x, y]: Vector) => (
    (x === 0 && y === 0) || (x === width && y === height)
    || (x === 0 && y === height) || (x === width && y === 0)
  );

  const tiles: GridTile[] = points.map(p => ({
    position: p,
    env: vContains(outline, p) ? E.Wall : E.Floor,
    zPos: Layers.BG
  }));

  const connectableEdges: ConnectableEdges = {
    [Cardinal.North]: findNorthernPoints(outline).filter(p => !isCornerPoint(p)),
    [Cardinal.South]: findSouthernPoints(outline).filter(p => !isCornerPoint(p)),
    [Cardinal.East]: findEasternPoints(outline).filter(p => !isCornerPoint(p)),
    [Cardinal.West]: findWesternPoints(outline).filter(p => !isCornerPoint(p)),
  };

  return {
    exits: generateExitsFromConnectableEdges(connectableEdges, random),
    outline,
    tiles,
    connectableEdges,
    maxHeight: height,
    maxWidth: width
  };
};

const cloneRoom = (room: Room): Room => {
  const tiles = room.tiles.map<GridTile>(t => ({
    position: t.position.slice() as Vector,
    env: t.env,
    zPos: t.zPos
  }));
  const connectableEdges: ConnectableEdges = {
    [Cardinal.East]: room.connectableEdges[Cardinal.East].map(v => v.slice() as Vector),
    [Cardinal.West]: room.connectableEdges[Cardinal.West].map(v => v.slice() as Vector),
    [Cardinal.North]: room.connectableEdges[Cardinal.North].map(v => v.slice() as Vector),
    [Cardinal.South]: room.connectableEdges[Cardinal.South].map(v => v.slice() as Vector),
  };
  const exits: Exit[] = room.exits.map(e => ({ position: e.position.slice() as Vector, cardinal: e.cardinal }));
  const outline: Vector[] = room.outline.map(v => v.slice() as Vector);

  return {
    connectableEdges,
    exits,
    tiles,
    outline,
    maxHeight: room.maxHeight,
    maxWidth: room.maxWidth
  }
};

export const translateRoom = (room: Room, offset: Vector): Room => {
  const clone = cloneRoom(room);
  clone.tiles.forEach(t => {
    t.position = vAdd(t.position, offset);
  });

  clone.outline.map(v => vAdd(v, offset));
  Object.values(clone.connectableEdges).forEach(vs => {
    vs.forEach(v => {
      v[0] += offset[0];
      v[1] += offset[1];
    });
  });

  clone.exits.forEach(e => {
    e.position = vAdd(e.position, offset);
  });
  return clone;
};

export const generateRoom = (random: Random): Room => {
  return random.choose([
    generateCircleRoom,
    generateRectRoom,
    generateBiteRoom,
  ])(random);
};
