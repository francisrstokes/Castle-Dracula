import { Layers, vAdd, vContains, vector, Vector, vEqual, vFromKey, vInZeroedBounds, vKey, vSub, vTaxiDist } from "../engine";
import { Random } from "../Random";
import { GridTile } from "../Scene";
import { playArea } from "../UI";
import { array, Nullable } from "../util";
import { Cardinal, cardinals, directions, findMaxWidthAndHeight, getOppositeCardinal, lineBetween, RoomConnection } from "./dungeon-utilities";
import { generateRoom, Room, RoomType, translateRoom } from "./room";
import {environment as E} from '../environment'

export type LevelGridValue = {
  gridTile: GridTile;
  roomIndices: number[];
};
export type LevelTileGrid = Nullable<LevelGridValue>[][];

export type LevelData = {
  rooms: Room[];
  level: LevelTileGrid;
  connections: RoomConnection[];
};

export const getLevelTileAt = ([x, y]: Vector, level: LevelTileGrid) => {
  const row = level[y];
  if (row) {
    const lt = row[x];
    if (lt) {
      return lt;
    }
  }
  return null;
}

const positionExistsInAnyRoom = (p: Vector, exclude: number, level: LevelTileGrid) => {
  const levelTile = getLevelTileAt(p, level);
  return levelTile && !levelTile.roomIndices.includes(exclude);
};

const indexLevel = (level: LevelTileGrid): LevelData => {
  const startPos = vector();
  position_search:
  for (let y = 0; y < level.length; y++) {
    for (let x = 0; x < level[0].length; x++) {
      const lt = getLevelTileAt([x, y], level);
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

    const lt = getLevelTileAt(pos,level);

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

      const lt = getLevelTileAt(p, level);

      rooms.push({
        connectableEdges: { North: [], South: [], East: [], West: [] },
        exits: [],
        maxWidth: maxes[0],
        maxHeight: maxes[1],
        outline: currentRoomWalls,
        tiles: allTiles.map(v => (level[v[1]][v[0]] as LevelGridValue).gridTile),
        type: RoomType.Unknown
      });

      // Write the new room index into the level data for this grid tile
      const roomIndex = rooms.length - 1;
      allTiles.forEach(v => {
        const lt = getLevelTileAt(v, level);
        if (lt) {
          lt.roomIndices = [roomIndex];
        }
      });

      currentRoomFloors = [];
      currentRoomWalls = [];
    }
  }

  // Create the connection index
  const connections: RoomConnection[] = [];
  Object.keys(doors).forEach(k => {
    const v = vFromKey(k);
    const neighbours = cardinals
      .map(c => getLevelTileAt(vAdd(v, c), level))
      .filter(x => x !== null)
      .map(lt => {
        if (lt) {
          const index = rooms.findIndex(room => vContains(room.tiles.map(t => t.position), lt.gridTile.position));
          return index;
        }
        return 0 as never;
      });

    const roomPairs = [...new Set(neighbours)];
    if (roomPairs.length > 1) {
      connections.push({
        exitPosition: v,
        roomA: rooms[roomPairs[0]],
        roomAIndex: roomPairs[0],
        roomB: rooms[roomPairs[1]],
        roomBIndex: roomPairs[1],
      });
    } else {
      const gridTile = {
        env: E.Floor,
        position: v,
        zPos: Layers.BG
      };
      // If this door only connects this room to this room, it can be replaced
      // with a floor
      level[v[1]][v[0]] = {
        gridTile,
        roomIndices: [roomPairs[0]]
      };

      // Add the floor tile to the room as well
      rooms[roomPairs[0]].tiles.push(gridTile);
    }
  });

  return {level, connections, rooms};
};

const addRoom = (room: Room, rooms: Room[], level: LevelTileGrid) => {
  rooms.push(room);
  const index = rooms.length - 1;
  room.tiles.forEach(t => {
    const levelTile = level[t.position[1]][t.position[0]];
    if (levelTile) {
      levelTile.roomIndices.push(index);
    } else {
      level[t.position[1]][t.position[0]] = {
        gridTile: t,
        roomIndices: [index]
      };
    }
  });
}

export const generateLevel = (random: Random, area = 2500): LevelData => {
  console.time('procgen');
  let totalArea = 0;

  const rooms: Room[] = [];
  const level: LevelTileGrid = array(playArea.dimensions[1], () => array(playArea.dimensions[0], () => null));
  const connections: RoomConnection[] = [];

  let room = generateRoom(random);
  let position: Vector = [
    random.intBetween(0, playArea.dimensions[0] - room.maxWidth),
    random.intBetween(0, playArea.dimensions[1] - room.maxHeight),
  ];
  room = translateRoom(room, position);

  addRoom(room, rooms, level);
  totalArea += room.tiles.length;

  const gridBounds = vSub(playArea.dimensions, [1, 1]);

  regenerate_room:
  while (totalArea < area) {
    room = generateRoom(random);

    // Find a room that can connect to this one
    const targetRooms = random.shuffle(rooms);
    while (targetRooms.length > 0) {
      const targetRoom = random.chooseAndSplice(targetRooms);
      const targetRoomIndex = rooms.indexOf(targetRoom);

      const exits = room.exits.slice();
      while (exits.length > 0) {
        const selectedExit = random.chooseAndSplice(exits);

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
          if (roomPositions.some(p => positionExistsInAnyRoom(p, targetRoomIndex, level))) {
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
          addRoom(room, rooms, level);

          // Turn walls into doors
          const roomDoor = room.tiles.find(t => vEqual(t.position, exitPosition));
          const targetDoor = targetRoom.tiles.find(t => vEqual(t.position, exitPosition));
          if (roomDoor) roomDoor.env = E.Door;
          if (targetDoor) targetDoor.env = E.Door;

          // Record the connection
          connections.push({
            exitPosition,
            roomA: room,
            roomB: targetRoom,
            roomAIndex: rooms.length - 1,
            roomBIndex: rooms.indexOf(targetRoom)
          });

          // Add to the total area covered
          totalArea += room.tiles.length;

          continue regenerate_room;
        }
      }
      console.log('couldn\'t place room, regenerating...');
    }
  }

  const roomDistances: Array<{
    roomA: number;
    pointA: Vector;
    roomB: number;
    pointB: Vector;
    distance: number; // taxicab metric
  }> = [];
  for (let roomA = 0; roomA < rooms.length; roomA++) {
    for (let roomB = roomA + 1; roomB < rooms.length; roomB++) {
      const alreadyConnected = connections.find(c => {
        const isA = c.roomAIndex === roomA || c.roomBIndex === roomA;
        const isB = c.roomAIndex === roomB || c.roomBIndex === roomB;
        return isA && isB;
      });
      if (!alreadyConnected) {
        const v1 = random.choose(rooms[roomA].tiles).position;
        const v2 = random.choose(rooms[roomB].tiles).position;
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

  const numConnectionsToTry = random.intBetween(1, rooms.length);
  for (let i = 0; i < numConnectionsToTry; i++) {
    const connection = roomDistances.shift();
    if (connection) {
      const {roomA, roomB} = connection;
      const allLines: Array<{
        pointA: Vector;
        pointB: Vector;
        distance: number; // taxicab metric
      }> = [];

      const roomAFloor = rooms[roomA].tiles.filter(t => (
        !vContains(rooms[roomA].outline, t.position)
      ));
      const roomBFloor = rooms[roomB].tiles.filter(t => (
        !vContains(rooms[roomB].outline, t.position)
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
        const lt = getLevelTileAt([x, y], level);

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
          // TODO: So far, ignoring these cases actually leads to more interestingly connected
          // rooms. They are a little chaotic though, so maybe only ignoring a fixed number
          // would be better
          console.log('One wall case not yet handled');
        } else {
          line.splice(wallIndices[1] + 1, line.length);
          line.splice(0, wallIndices[0]);

          line.forEach(([x, y]) => {
            const lt = getLevelTileAt([x, y], level);
            if (!lt) {
              level[y][x] = {
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

    const lt = getLevelTileAt(v, level);
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
  const startPoint = rooms[0].tiles
    .find(gt => {
      const lt = getLevelTileAt(gt.position, level);
      return lt && lt.gridTile.env === E.Floor;
    })
    ?.position ?? [0, 0];
  findFloorsNextToVoids(startPoint, [-1, -1]);

  floorsNextToVoids.forEach(([x, y]) => {
    directions.forEach(([cx, cy]) => {
      const ox = cx+x;
      const oy = cy+y;

      if (oy < level.length && ox < level[0].length && !level[oy][ox]) {
        level[oy][ox] = {
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
  const returnValue = indexLevel(level);
  console.timeEnd('procgen');

  return returnValue;
}