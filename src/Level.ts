import { Color, Game, Layers, Renderer, Tile, vAdd, vContains, vDist, vector, Vector, vEqual, vFromKey, vInZeroedBounds, vKey, vMul, vObj, vSub, vTaxiDist } from "./engine";
import { Player } from "./Player";
import { Random } from "./Random";
import { GridTile, Scene } from "./Scene";
import { Room, Grid, Region, Exit, ConnectableEdges, Cardinal, RoomConnection, getGridNeighbourCount, cardinals, getBoundsOfGrid, findRegionsInGrid, flood, getOppositeCardinal, directions, findMaxWidthAndHeight } from "./dungeon-utilities";
import { array, mapRange } from "./util";

import {AStarFinder} from 'astar-typescript';
import { descriptionArea, infoArea, playArea } from "./ui";
import { alpha, gray, noColor, red, yellow } from "./palette";
import { environment as E } from "./environment";

const PathTile = Tile.from(' ', noColor, alpha(yellow[7], 0.5));


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
}

const translateRoom = (room: Room, offset: Vector): Room => {
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

const findOutline = (points: Vector[], grid?: Grid, bounds?: Vector): Vector[] => {
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

const findLargestRegionIndex = (regions: Region[]) => {
  let largestIndex = -1;
  let numCells = 0;
  for (let i = 0; i < regions.length; i++) {
    if (regions[i].length > numCells) {
      numCells = regions[i].length;
      largestIndex = i;
    }
  }
  return largestIndex;
}

const findNorthernPoints = (points: Vector[]) => {
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

const findSouthernPoints = (points: Vector[]) => {
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

const findWesternPoints = (points: Vector[]) => {
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

const findEasternPoints = (points: Vector[]) => {
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

const generateExitsFromConnectableEdges = (connectableEdges: ConnectableEdges, random: Random) => {
  const exits: Exit[] = [];
  Object.entries(connectableEdges).forEach(([cardinal, points]) => {
    // Generate for this cardinal?
    if (points.length > 0 && random.bool()) {
      exits.push({ position: random.choose(points), cardinal: cardinal as unknown as Cardinal });
    }
  });
  return exits;
}

const pointsToGrid = (points: Region): Grid => {
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
}

const lineBetween = ([px1, py1]: Vector, [px2, py2]: Vector) => {
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
}

type Nullable<T> = T | null;
type LevelGridValue = {
  gridTile: GridTile;
  roomIndices: number[];
};
type LevelTileGrid = Nullable<LevelGridValue>[][];

type CardinalNeighbours = Record<Cardinal, Nullable<GridTile>>;

type Automove = {
  active: boolean;
  path: Vector[];
  interval: number;
  timer: number;
};

export class Level extends Scene {
  private renderer: Renderer;
  private random: Random;
  private rooms: Room[] = [];
  private connections: RoomConnection[] = [];

  private level: LevelTileGrid;
  private gridBounds: Vector;

  private debugDrawBuffer: Vector[] = [];

  private levelSeen: Map<Vector, GridTile> = new Map();

  private showComputedPath = false;
  private pathTarget = vector();
  private pointedTile = vector();
  private computedPath: Vector[] = [];

  private autoMove: Automove = {
    active: false,
    interval: 2,
    path: [],
    timer: 0
  };

  constructor(game: Game, seed: number, public player: Player) {
    super(game);
    this.renderer = game.renderer;
    this.random = new Random(seed);

    this.level = array(playArea.dimensions[1], () => array(playArea.dimensions[0], () => null));

    const levelTotalArea = playArea.dimensions[0] * playArea.dimensions[1];
    const percentToFill = 0.6;
    const areaSize = Math.floor(levelTotalArea * percentToFill);

    this.gridBounds = vSub(playArea.dimensions, [1, 1]);

    this.procgen(areaSize);

    let startPoint: Vector | null = null;
    while (!startPoint) {
      const gridTile = this.random.choose(this.rooms).tiles.find(gt => {
        const lt = this.level[gt.position[1]][gt.position[0]];
        return lt && lt.gridTile.env.tile === E.Floor.tile;
      });
      if (gridTile) {
        startPoint = gridTile.position;
      }
    }
    this.player.position = startPoint;
  }

  private generateCircleRoom(): Room {
    const radius = this.random.intBetween(4, 15, 3);
    const center: Vector = [radius, radius];
    const points: Vector[] = [];

    const innerRadius = this.random.intBetween(2, radius / 2);
    const createHole = radius > 6 && this.random.bool();

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
      exits: generateExitsFromConnectableEdges(connectableEdges, this.random),
      outline,
      connectableEdges,
      maxHeight: radius*2,
      maxWidth: radius*2,
      tiles
    }
  }

  private generateRectRoom(): Room {
    const height = this.random.intBetween(4, 16, 3.4);
    const width = this.random.intBetween(4, 26, 1.6);
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
      exits: generateExitsFromConnectableEdges(connectableEdges, this.random),
      outline,
      tiles,
      connectableEdges,
      maxHeight: height,
      maxWidth: width
    };
  }

  private generateBiteRoom(): Room {
    const height = this.random.intBetween(8, 16);
    const width = this.random.intBetween(8, 16);

    let points: Vector[] = [];
    const grid: Grid = array(height, () => array(width, () => 0));
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        points.push([x, y]);
        grid[y][x] = 1;
      }
    }

    let outline = findOutline(points, grid);
    let P = this.random.choose(outline);

    const tilesToEat = this.random.intBetween(5, (height*width) >> 1);
    let tilesEaten = 0;

    while (tilesEaten < tilesToEat) {
      const toEatThisRound = Math.min(tilesToEat-tilesEaten, this.random.intBetween(1, 10));
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
        for (const C of this.random.shuffle(cardinals)) {
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
      P = this.random.choose(outline);
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
      return this.generateBiteRoom();
    }

    const connectableEdges: ConnectableEdges = {
      [Cardinal.North]: findNorthernPoints(outline),
      [Cardinal.South]: findSouthernPoints(outline),
      [Cardinal.East]: findEasternPoints(outline),
      [Cardinal.West]: findWesternPoints(outline),
    };

    return {
      exits: generateExitsFromConnectableEdges(connectableEdges, this.random),
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
  }

  private generateRoom(): Room {
    const roomFns = [
      this.generateCircleRoom,
      this.generateRectRoom,
      this.generateBiteRoom,
      // this.generateCorridor
    ];
    const fn = this.random.choose(roomFns);
    return fn.apply(this);
  }

  private positionExistsInAnyRoom([x, y]: Vector, exclude: number) {
    const levelTile = this.level[y][x];
    return levelTile && !levelTile.roomIndices.includes(exclude);
  }

  private addRoom(room: Room) {
    this.rooms.push(room);
    const index = this.rooms.length - 1;
    room.tiles.forEach(t => {
      const levelTile = this.level[t.position[1]][t.position[0]];
      if (levelTile) {
        levelTile.roomIndices.push(index);
      } else {
        this.level[t.position[1]][t.position[0]] = {
          gridTile: t,
          roomIndices: [index]
        };
      }
    });
  }

  private indexLevel() {
    const startPos = vector();
    position_search:
    for (let y = 0; y < this.level.length; y++) {
      for (let x = 0; x < this.level[0].length; x++) {
        const lt = this.getLevelTileAt([x, y]);
        if (lt && lt.gridTile.env === E.Floor) {
          startPos[0] = x;
          startPos[1] = y;
          break position_search;
        }
      }
    }

    const rooms: Room[] = [];
    const seen: Record<string, true> = {};
    const doors: Record<string, true> = {};

    let currentRoomFloors: Vector[] = [];
    let currentRoomWalls: Vector[] = [];

    let searchStack: Vector[] = [startPos];

    const floodRoom = (pos: Vector, startingDoor = false) => {
      const key = vKey(pos);
      if (key in seen && !(key in doors)) return;
      seen[key] = true;

      const lt = this.getLevelTileAt(pos);

      if (lt) {
        if (lt.gridTile.env === E.Wall) {
          currentRoomWalls.push(pos);
        } else if (lt.gridTile.env === E.Floor) {
          currentRoomFloors.push(pos);
          for (const dir of directions) {
            floodRoom(vAdd(pos, dir));
          }
        } else if (lt.gridTile.env === E.Door) {
          if (!(key in doors)) {
            searchStack.push(pos);
            doors[key] = true;
          } else if (startingDoor) {
            for (const dir of directions) {
              floodRoom(vAdd(pos, dir));
            }
          }
        }
      }
    };

    // Create the room index
    while (searchStack.length) {
      const p = searchStack.pop();
      if (p) {
        floodRoom(p, true);
        if (currentRoomFloors.length + currentRoomWalls.length === 0) continue;

        const allTiles = [...currentRoomWalls, ...currentRoomFloors];
        const maxes = findMaxWidthAndHeight(allTiles);
        rooms.push({
          connectableEdges: { North: [], South: [], East: [], West: [] },
          exits: [],
          maxWidth: maxes[0],
          maxHeight: maxes[1],
          outline: currentRoomWalls,
          tiles: allTiles.map(v => (this.level[v[1]][v[0]] as LevelGridValue).gridTile)
        });
        currentRoomFloors = [];
        currentRoomWalls = [];
      }
    }
    this.rooms = rooms;

    // Create the connection index
    const connections: RoomConnection[] = [];
    Object.keys(doors).forEach(k => {
      const v = vFromKey(k);
      const neighbours = cardinals
        .map(c => this.getLevelTileAt(vAdd(v, c)))
        .filter(x => x !== null)
        .map(lt => {
          if (lt) {
            const index = this.rooms.findIndex(room => vContains(room.tiles.map(t => t.position), lt.gridTile.position));
            return index;
          }
          return 0 as never;
        });

      const roomPairs = [...new Set(neighbours)];
      if (roomPairs[0] !== roomPairs[1]) {
        connections.push({
          exitPosition: v,
          roomA: this.rooms[roomPairs[0]],
          roomAIndex: roomPairs[0],
          roomB: this.rooms[roomPairs[1]],
          roomBIndex: roomPairs[1],
        });
      } else {
        // If this door only connects this room to this room, it can be removed
        this.level[v[1]][v[0]] = null;
      }
    });
    this.connections = connections;
  }

  private procgen(area = 2500) {
    console.time('procgen');
    let totalArea = 0;

    this.rooms = [];
    this.level = array(playArea.dimensions[1], () => array(playArea.dimensions[0], () => null));

    let room = this.generateRoom();
    let position: Vector = [
      this.random.intBetween(0, playArea.dimensions[0] - room.maxWidth),
      this.random.intBetween(0, playArea.dimensions[1] - room.maxHeight),
    ];
    room = translateRoom(room, position);

    // this.rooms.push(room);
    this.addRoom(room);
    totalArea += room.tiles.length;

    const gridBounds = vSub(playArea.dimensions, [1, 1]);

    regenerate_room:
    while (totalArea < area) {
      room = this.generateRoom();

      // Find a room that can connect to this one
      const targetRooms = this.random.shuffle(this.rooms);
      while (targetRooms.length > 0) {
        const targetRoom = this.random.chooseAndSplice(targetRooms);
        const targetRoomIndex = this.rooms.indexOf(targetRoom);

        const exits = room.exits.slice();
        while (exits.length > 0) {
          const selectedExit = this.random.chooseAndSplice(exits);

          const connectingCardinal = getOppositeCardinal(selectedExit.cardinal);
          const edge = targetRoom.connectableEdges[connectingCardinal];

          // Try to match the room to the target along a point on its edge
          for (let edgePosition of edge) {
            if (!selectedExit || !selectedExit.position) {
              debugger;
            }
            const translate = vSub(edgePosition, selectedExit.position);
            const roomPositions = room.tiles.map(t => vAdd(t.position, translate));

            // Is the room in bounds?
            if (!roomPositions.every(p => vInZeroedBounds(gridBounds, p))) {
              continue;
            }

            // Does the room overlap with any other room aside from the target?
            if (roomPositions.some(p => this.positionExistsInAnyRoom(p, targetRoomIndex))) {
              continue;
            }

            // Does the room intersect with any points of the target room other than the connecting edge?
            const withoutEdge = targetRoom.tiles
              .map(t => t.position)
              .filter(p => !vContains(edge, p));

            if (roomPositions.some(p => vContains(withoutEdge, p))) {
              continue;
            }

            // The room passed the checks, we can add it to the room list
            // Update the tile positions
            room.tiles.forEach((t, i) => {
              t.position = roomPositions[i];
            });
            // Update the outline
            room.outline = room.outline.map(v => vAdd(v, translate));
            // Update the edges
            Object.keys(room.connectableEdges).forEach(key => {
              const c = key as Cardinal;
              room.connectableEdges[c] = room.connectableEdges[c].map(v => vAdd(v, translate));
            });

            // Remove the overlapping tiles from the connectable edges list
            const overlap = room.connectableEdges[selectedExit.cardinal].filter(re => (
              vContains(targetRoom.connectableEdges[connectingCardinal], re)
            ));
            targetRoom.connectableEdges[connectingCardinal] = targetRoom.connectableEdges[connectingCardinal].filter(e => {
              return !vContains(overlap, e);
            });
            room.connectableEdges[selectedExit.cardinal] = room.connectableEdges[selectedExit.cardinal].filter(e => {
              return !vContains(overlap, e);
            });

            const exitPosition = vAdd(translate, selectedExit.position);

            // Push the room
            this.addRoom(room);
            // this.rooms.push(room);

            // Turn walls into doors
            const roomDoor = room.tiles.find(t => vEqual(t.position, exitPosition));
            const targetDoor = targetRoom.tiles.find(t => vEqual(t.position, exitPosition));
            if (roomDoor) roomDoor.env = E.Door;
            if (targetDoor) targetDoor.env = E.Door;

            // Record the connection
            this.connections.push({
              exitPosition,
              roomA: room,
              roomB: targetRoom,
              roomAIndex: this.rooms.length - 1,
              roomBIndex: this.rooms.indexOf(targetRoom)
            });

            // Add to the total area covered
            totalArea += room.tiles.length;

            continue regenerate_room;
          }
        }
        console.log('couldnt place room, regenerating...');
      }
    }

    const roomDistances: Array<{
      roomA: number;
      pointA: Vector;
      roomB: number;
      pointB: Vector;
      distance: number; // taxicab metric
    }> = [];
    for (let roomA = 0; roomA < this.rooms.length; roomA++) {
      for (let roomB = roomA + 1; roomB < this.rooms.length; roomB++) {
        const alreadyConnected = this.connections.find(c => {
          const isA = c.roomAIndex === roomA || c.roomBIndex === roomA;
          const isB = c.roomAIndex === roomB || c.roomBIndex === roomB;
          return isA && isB;
        });
        if (!alreadyConnected) {
          const v1 = this.random.choose(this.rooms[roomA].tiles).position;
          const v2 = this.random.choose(this.rooms[roomB].tiles).position;
          roomDistances.push({
            roomA,
            roomB,
            pointA: v1,
            pointB: v2,
            distance: vTaxiDist(v1, v2)
          });
        }
      }
    }

    roomDistances.sort((a, b) => a.distance - b.distance);

    const numConnectionsToTry = this.random.intBetween(1, this.rooms.length);
    for (let i = 0; i < numConnectionsToTry; i++) {
      const connection = roomDistances.shift();
      if (connection) {
        const {roomA, roomB} = connection;
        const allLines: Array<{
          pointA: Vector;
          pointB: Vector;
          distance: number; // taxicab metric
        }> = [];

        const roomAFloor = this.rooms[roomA].tiles.filter(t => (
          !vContains(this.rooms[roomA].outline, t.position)
        ));
        const roomBFloor = this.rooms[roomB].tiles.filter(t => (
          !vContains(this.rooms[roomB].outline, t.position)
        ));

        for (const t1 of roomAFloor) {
          for (const t2 of roomBFloor) {
            allLines.push({
              pointA: t1.position,
              pointB: t2.position,
              distance: vTaxiDist(t1.position, t2.position)
            });
          }
        }
        const shortestDistance = allLines.sort((a, b) => a.distance - b.distance)[0];
        const line = lineBetween(shortestDistance.pointA, shortestDistance.pointB);

        let wallCount = 0;
        let wallIndices: number[] = [];
        const onlyInSelectedRooms = line.every(([x, y], i) => {
          const lt = this.level[y][x];

          if (lt) {
            // While we're here, we can also check if this is a wall
            if (lt.gridTile.env === E.Wall) {
              wallCount++;
              wallIndices.push(i);
            }
            const containsA = lt.roomIndices.includes(roomA);
            const containsB = lt.roomIndices.includes(roomB);
            return (containsA || containsB) && lt.roomIndices.length <= 2;
          }

          // It's fine for the line to pass through empty positions
          return true;
        });

        if (onlyInSelectedRooms) {
          if (wallCount === 1) {
            console.log('One wall case not yet handled')
          } else {
            line.splice(wallIndices[1] + 1, line.length);
            line.splice(0, wallIndices[0]);

            line.forEach(([x, y]) => {
              const lt = this.level[y][x];
              if (!lt) {
                this.level[y][x] = {
                  gridTile: {
                    env: E.Floor,
                    position: [x, y],
                    zPos: Layers.BG
                  },
                  roomIndices: [roomA, roomB]
                }
              } else {
                lt.gridTile.env = E.Floor;
                lt.roomIndices = [roomA, roomB];
              }
            })
          }
        }
      }
    }

    // Flood fill the level, finding all floors that are next to at least one void
    // Iterate the list of floors, find the surrounding voids, and convert them to walls
    const floorsNextToVoids: Vector[] = [];
    const seenTilesMap: Record<string, true> = {};
    const findFloorsNextToVoids = (v: Vector, prevV: Vector): void => {
      const key = vKey(v);
      if (seenTilesMap[key]) return;
      seenTilesMap[key] = true;

      const lt = this.level[v[1]][v[0]];
      if (lt) {
        if (lt.gridTile.env === E.Floor || lt.gridTile.env === E.Door) {
          for (const c of directions) {
            findFloorsNextToVoids(vAdd(c, v), v);
          }
        }
      } else if (!vContains(floorsNextToVoids, prevV)) {
        floorsNextToVoids.push(prevV);
      }
    };
    const startPoint = this.rooms[0].tiles
      .find(gt => {
        const lt = this.level[gt.position[1]][gt.position[0]];
        return lt && lt.gridTile.env === E.Floor;
      })
      ?.position ?? [0, 0];
    findFloorsNextToVoids(startPoint, [-1, -1]);

    floorsNextToVoids.forEach(([x, y]) => {
      directions.forEach(([cx, cy]) => {
        const ox = cx+x;
        const oy = cy+y;
        if (!this.level[oy][ox]) {
          this.level[oy][ox] = {
            gridTile: {
              position: [ox, oy],
              env: E.Wall,
              zPos: Layers.BG
            },
            roomIndices: []
          }
        }
      })
    });

    // Take a moment to reindex the level (recompute the rooms and doors)
    // This removes redundant doors, and merges rooms that were previously
    // considered separate
    this.indexLevel();
    console.timeEnd('procgen');
  }

  getTileAt([x, y]: Vector) {
    if (y <= this.level.length - 1 && x <= this.level[0].length - 1) {
      const lt = this.level[y][x];
      if (lt) {
        return lt.gridTile.env.tile;
      }
    }
    return null;
  }

  getLevelTileAt([x, y]: Vector) {
    const row = this.level[y];
    if (row) {
      const lt = row[x];
      if (lt) {
        return lt;
      }
    }
    return null;
  }

  private renderPlayerVisual() {
    const circleAroundPlayer = this.player.viewCircle.map(v => vAdd(v, this.player.position));
    for (const p of circleAroundPlayer) {
      const levelTile = this.getLevelTileAt(p);
      if (levelTile) {
        this.levelSeen.set(levelTile.gridTile.position, levelTile.gridTile);

        const dist = vDist(this.player.position, p);
        const lightIndex = Math.floor(mapRange([0, this.player.viewRadius], [0, this.player.lightLevels.length-1], dist));
        this.renderer.drawTile(levelTile.gridTile.env.tile, levelTile.gridTile.zPos, playArea.translate(levelTile.gridTile.position), {
          darken: this.player.lightLevels[lightIndex]
        });
      }
    }
  }

  private renderLevelSeen() {
    this.levelSeen.forEach(gridTile => {
      this.renderer.drawTile(gridTile.env.tile, gridTile.zPos, playArea.translate(gridTile.position), {
        darken: 0.85
      });
    });
  }

  private renderPath() {
    if (this.showComputedPath) {
      this.computedPath.forEach(v => {
        this.renderer.drawTile(PathTile, Layers.HUD, playArea.translate(v));
      });
    }
  }

  private renderTileDescription() {
    const DescriptionTile = Tile.from(' ', gray[7], red[0]);
    let description = '---';

    if (this.showComputedPath) {
      if (vContains([...this.levelSeen.keys()], this.pointedTile)) {
        const lt = this.getLevelTileAt(this.pointedTile);
        if (lt) {
          description = lt.gridTile.env.description;
        }
      } else {
        description = 'This area cannot be seen clearly';
      }
    } else {
      const lt = this.getLevelTileAt(this.player.position);
      if (lt) {
        description = lt.gridTile.env.description;
      }
    }

    array(descriptionArea.dimensions[1], y => array<Vector>(descriptionArea.dimensions[0], x => [x, y]))
    .flat(1)
    .forEach((v, i) => {
      const char = (i > 0 && i <= description.length) ? description[i-1] : ' ';
      this.renderer.drawTile(DescriptionTile, Layers.BG, descriptionArea.translate(v), { char })
    });
  }

  renderInfoArea() {
    const SideTile = Tile.from(' ', gray[7], gray[1]);
    const FilledTile = Tile.from(' ', gray[7], red[3]);
    const UnfilledTile = Tile.from(' ', gray[7], red[1]);

    type VectorTile = { v: Vector, t: Tile };
    const divider: VectorTile[] = array(infoArea.dimensions[1], y => ({ v: [0, y], t: SideTile }));

    divider.forEach(({v, t}) => {
      this.renderer.drawTile(t, Layers.BG, infoArea.translate(v));
    });

    const numHealthItems = 17;
    const numFilled = Math.floor(mapRange([0, this.player.maxHp], [0, numHealthItems], this.player.hp));
    const percent = Math.floor(mapRange([0, this.player.maxHp], [0, 100], this.player.hp)).toString();

    for (let i = 0; i < numHealthItems; i++) {
      const x = i + 2;

      let char = ' ';
      if (i === 0) char = 'H';
      if (i === 1) char = 'P';

      // Percentage at the end of the bar
      for (let pc = 0; pc < percent.length; pc++) {
        if (i === numHealthItems - pc - 2) char = percent[percent.length - pc - 1];
      }
      if (i === numHealthItems - 1) char = '%';

      const tile = (i < numFilled) ? FilledTile : UnfilledTile;
      this.renderer.drawTile(tile, Layers.BG, infoArea.translate([x, 1]), {
        char
      });
    }
  }

  render(frame: number): void {
    const {renderer} = this;

    const debug = false;

    if (!debug) {
      this.renderPlayerVisual();
      this.renderLevelSeen();
      this.renderPath();
      this.renderTileDescription();
      this.renderInfoArea();
    } else {
      this.rooms.forEach(room => {
        room.tiles.forEach(gt => {
          renderer.drawTile(gt.env.tile, gt.zPos, playArea.translate(gt.position), {
          });
        });
      });

      this.connections.forEach(connection => {
        renderer.drawTile(E.Door.tile, Layers.BG, playArea.translate(connection.exitPosition));
      });
    }

    this.renderer.commit();
  }

  private debugRender() {
    this.renderer.clearBackground([0,0,0,1]);
    this.render(1);
    this.renderer.commit();
  }

  onBeforeCommit(frame: number): void {

  }

  update(frame: number): void {
    const {input} = this.getGame();

    if (input.mouseMoved()) {
      // Which tile is the mouse pointed at
      const scaleV: Vector = [1/(this.renderer.getTileSize() * 0.5), 1/this.renderer.getTileSize()];
      this.pointedTile = vMul(input.mousePositon(), scaleV);
      this.pointedTile[0] = Math.max(0, Math.floor(this.pointedTile[0]));
      this.pointedTile[1] = Math.max(0, Math.floor(this.pointedTile[1]) - 1);

      if (vInZeroedBounds(this.gridBounds, this.pointedTile)) {
        this.pathTarget = this.pointedTile;
      }

      // Compute the path
      const searchGrid = this.level.map(row => row.map(lt => {
        if (!lt) return 1;
        if (!this.levelSeen.has(lt.gridTile.position)) return 1;
        if (lt.gridTile.env.tile.hasProperty('solid')) return 1;

        return 0;
      }));

      const astar = new AStarFinder({
        grid: { matrix: searchGrid },
        diagonalAllowed: false
      });
      this.computedPath = astar.findPath(vObj(this.player.position), vObj(this.pathTarget)) as Vector[];

      // Ensure that the path is rendered
      this.showComputedPath = true;
    }

    if (input.mouseClicked()) {
      if (this.computedPath.length) {
        this.autoMove.active = true;
        this.autoMove.timer = 0;
        this.autoMove.path = [...this.computedPath];
      }
    }

    if (frame % 5 === 0) {
      const nextPosition = this.player.getNextPosition();

      if (!vEqual(this.player.position, nextPosition)) {
        this.showComputedPath = false;
        this.autoMove.active = false;
      }

      const lt = this.getLevelTileAt(nextPosition);
      if (lt) {
        if (!lt.gridTile.env.tile.hasProperty('solid')) {
          this.player.position = nextPosition;
        }
      }
    }

    if (this.autoMove) {
      if (this.autoMove.timer < this.autoMove.interval) {
        this.autoMove.timer++
      } else {
        this.autoMove.timer = 0;
        const nextPosition = this.autoMove.path.shift();
        let invalidMove = false;

        if (nextPosition) {
          const lt = this.getLevelTileAt(nextPosition);
          if (lt) {
            if (!lt.gridTile.env.tile.hasProperty('solid')) {
              this.player.position = nextPosition;
            } else {
              invalidMove = true;
            }
          } else {
            invalidMove = true;
          }
        } else {
          invalidMove = true;
        }

        if (invalidMove) {
          this.autoMove.active = false;
          this.autoMove.timer = 0;
        }
      }
    }
  }

  getCardinalNeighbours([x, y]: Vector): CardinalNeighbours {
    const North = vInZeroedBounds(this.gridBounds, [x, y-1]) ? (this.level[y-1][x]?.gridTile ?? null) : null;
    const South = vInZeroedBounds(this.gridBounds, [x, y+1]) ? (this.level[y+1][x]?.gridTile ?? null) : null;
    const East = vInZeroedBounds(this.gridBounds, [x+1, y]) ? (this.level[y][x+1]?.gridTile ?? null) : null;
    const West = vInZeroedBounds(this.gridBounds, [x-1, y]) ? (this.level[y][x-1]?.gridTile ?? null) : null;
    return { North, South, East, West };
  }
}
