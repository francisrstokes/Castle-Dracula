import { Game, Layers, Renderer, Tile, vAdd, vContains, vDist, vector, Vector, vEqual, vInZeroedBounds, vMul, vObj, vSub } from "./engine";
import { Player } from "./Actor/Player";
import { Random } from "./Random";
import { GridTile, Scene } from "./Scene";
import { array, mapRange } from "./util";
import { descriptionArea, statsArea, playArea, gridSize } from "./UI";
import { alpha, blue, gray, linearGradientA, noColor, red, yellow } from "./palette";
import { environment as E, EnvProperty } from "./environment";
import { RoomConnection } from "./PCG/dungeon-utilities";
import { generateLevel, getLevelTileAt, LevelTileGrid } from "./PCG/level";
import { Actor } from "./Actor";
import { Scheduler } from "./Scheduler";
import { Enemy, exampleAI } from "./Actor/Enemy";
import { AStarFinder } from 'astar-typescript';
import { Bat } from "./Actor/enemies";
import { Room } from "./PCG/room";
import { MessageArea } from "./MessageArea";
import { GameEvent, GameEventData } from "./events";
import { hpBar } from "./UI/hp-bar";

const PathTile = Tile.from(' ', noColor, alpha(yellow[7], 0.5));

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

  private actors: Actor[] = [];
  private scheduler = new Scheduler();

  private debugDrawBuffer: Vector[] = [];

  private levelSeen: Map<Vector, GridTile> = new Map();

  private showComputedPath = false;
  private pathTarget = vector();
  private pointedTile = vector();
  private computedPath: Vector[] = [];

  private isPlayersTurn = true;

  private showRooms = false;

  private autoMove: Automove = {
    active: false,
    interval: 2,
    path: [],
    timer: 0
  };

  constructor(game: Game, random: Random, public player: Player, private messages: MessageArea) {
    super(game);
    this.renderer = game.renderer;
    this.random = random;

    const levelTotalArea = playArea.dimensions[0] * playArea.dimensions[1];
    const percentToFill = 0.6;
    const areaSize = Math.floor(levelTotalArea * percentToFill);

    this.gridBounds = vSub(playArea.dimensions, [1, 1]);

    const levelData = generateLevel(this.random, areaSize);
    this.rooms = levelData.rooms;
    this.level = levelData.level;
    this.connections = levelData.connections;

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

    const enemy = new Enemy(game, this.random, Bat);
    this.scheduler.loadActors([this.player, enemy]);
    this.actors.push(enemy);

    // pick a random room and position for this enemy
    const roomIndex = this.random.choose(array(this.rooms.length, i => i));
    const randomPosition = this.random.choose(this.rooms[roomIndex].tiles
      .filter(t => !vContains(this.rooms[roomIndex].outline, t.position))
      .map(t => t.position));
    enemy.position = randomPosition;
    this.player.position = enemy.position;

    game.on(GameEvent.ActorHit, ({attacker, defender, damage}: GameEventData[GameEvent.ActorHit]) => {
      if (defender === this.player) {
        this.messages.insert(`The ${attacker.name} hits you for ${damage} damage.`);
      } else {
        this.messages.insert(`You hit the ${defender.name} for ${damage} damage.`);
      }
    });

    game.on(GameEvent.ActorMissed, ({defender}: GameEventData[GameEvent.ActorMissed]) => {
      if (defender === this.player) {
        this.messages.insert(`The ${defender.name} misses you.`);
      } else {
        this.messages.insert(`You miss the ${defender.name}.`);
      }
    });

    game.on(GameEvent.ActorKilled, ({defender}: GameEventData[GameEvent.ActorKilled]) => {
      debugger;
      if (defender === this.player) {
        this.messages.insert(`You die.`);
      } else {
        this.messages.insert(`You deliver a fatal blow to the ${defender.name}.`);
        this.actors = this.actors.filter(a => a !== defender);
        this.scheduler.unload(defender);
      }
    });
  }

  getTileAt(v: Vector) {
    return getLevelTileAt(v, this.level)?.gridTile;
  }

  getLevelTileAt(v: Vector) {
    return getLevelTileAt(v, this.level);
  }

  getActorAt(v: Vector) {
    return this.actors.find(a => vEqual(a.position, v)) ?? null;
  }

  getRoomIndexFromPosition(v: Vector) {
    const lt = this.getLevelTileAt(v);
    if (!lt) return -1;
    return lt.roomIndices[0];
  }

  pathfindToPlayer(position: Vector) {
    const searchGrid = this.level.map(row => row.map(lt => {
      if (!lt) return 1;
      if (lt.gridTile.env.tile.hasProperty(EnvProperty.Solid)) return 1;
      return 0;
    }));

    const astar = new AStarFinder({
      grid: { matrix: searchGrid },
      diagonalAllowed: false
    });

    return astar.findPath(vObj(position), vObj(this.player.position)) as Vector[];
  }

  private renderPlayerVisual(frame: number) {
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

    this.player.render(frame);

    const playerRoomIndex = this.getRoomIndexFromPosition(this.player.position);
    for (const actor of this.actors) {
      const enemyRoomIndex = this.getRoomIndexFromPosition(actor.position);
      if (playerRoomIndex === enemyRoomIndex && vContains(circleAroundPlayer, actor.position)) {
        actor.render(0);
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

  private getDescriptionAtPosition(position: Vector) {
    // Only get descriptions for areas the player has seen
    if (vContains([...this.levelSeen.keys()], position)) {
      // Check if there is an actor in this space
      const actor = this.actors.find(a => vEqual(a.position, position));
      if (actor) {
        return (actor as Enemy).description;
      }

      // Check if there is a level tile here
      const lt = this.getLevelTileAt(position);
      if (lt) {
        return lt.gridTile.env.description;
      }
    }

    return 'This area cannot be seen clearly';
  }

  private renderTileDescription() {
    const DescriptionTile = Tile.from(' ', gray[7], red[0]);
    const description = this.showComputedPath
      ? this.getDescriptionAtPosition(this.pointedTile)
      : this.getDescriptionAtPosition(this.player.position);

    array(descriptionArea.dimensions[1], y => array<Vector>(descriptionArea.dimensions[0], x => [x, y]))
    .flat(1)
    .forEach((v, i) => {
      const char = (i > 0 && i <= description.length) ? description[i-1] : ' ';
      this.renderer.drawTile(DescriptionTile, Layers.BG, descriptionArea.translate(v), { char })
    });
  }

  private renderStatsArea() {
    const SideTile = Tile.from(' ', gray[7], gray[1]);

    type VectorTile = { v: Vector, t: Tile };
    const divider: VectorTile[] = array(statsArea.dimensions[1], y => ({ v: [0, y], t: SideTile }));

    divider.forEach(({v, t}) => {
      this.renderer.drawTile(t, Layers.BG, statsArea.translate(v));
    });

    const offset: Vector = [2, 1];
    hpBar(this.player.hp, this.player.maxHp, 17).forEach(({ position, tile }) => {
      this.renderer.drawTile(tile, Layers.BG, statsArea.translate(vAdd(position, offset)));
    });
  }

  render(frame: number): void {
    const {renderer} = this;

    const debug = false;

    if (!debug) {
      this.renderLevelSeen();
      this.renderPath();
      this.renderPlayerVisual(frame);
      this.renderTileDescription();
      this.renderStatsArea();
      this.messages.render();

      if (this.showRooms) {
        const colors = linearGradientA(this.rooms.length, [255, 0, 0], [0, 0, 255], 0.2);
        this.rooms.forEach((room, i) => {
          room.tiles.forEach(t => {
            renderer.drawTile(t.env.tile, Layers.FG, playArea.translate(t.position), {
              char: ' ',
              background: colors[i],
              color: noColor
            });
          })
        });
        const mouseString = `(${this.pointedTile.join(',')})`;
        const coordinateTile = Tile.from(mouseString, gray[7], noColor);
        this.renderer.drawTile(coordinateTile, Layers.HUD, [0, gridSize[1]-1]);
      }
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

  onBeforeCommit(frame: number): void {}

  update(frame: number): void {
    let turnTaken = false;

    if (frame % 5 === 0 && this.getGame().input.keyIsDown('r')) {
      this.showRooms = !this.showRooms;
    }

    if (!this.isPlayersTurn) {
      const nextActor = this.scheduler.next();

      if (nextActor === this.player) {
        this.isPlayersTurn = true;
      } else {
        nextActor.update(frame, this);
      }
    }

    if (this.isPlayersTurn) {
      turnTaken = this.player.update(frame, this);
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
          if (lt.gridTile.env.tile.hasProperty(EnvProperty.Solid)) return 1;

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
          this.computedPath = [];

          turnTaken = true;
        }
      }

      if (input.anyKeyPressedThisFrame()) {
        this.autoMove.active = false;
        this.autoMove.timer = 0;
        this.showComputedPath = false;
        this.autoMove.path = [];
        this.computedPath = [];
      }

      if (this.autoMove.active) {
        turnTaken = true;

        if (this.autoMove.timer < this.autoMove.interval) {
          this.autoMove.timer++
        } else {
          this.autoMove.timer = 0;
          const nextPosition = this.autoMove.path.shift();
          let invalidMove = false;

          if (nextPosition) {
            const lt = this.getLevelTileAt(nextPosition);
            if (lt) {
              if (!lt.gridTile.env.tile.hasProperty(EnvProperty.Solid)) {
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

          if (invalidMove || this.autoMove.path.length === 0) {
            this.autoMove.active = false;
            this.autoMove.timer = 0;
            this.showComputedPath = false;
            this.autoMove.path = [];
            this.computedPath = [];
          }
        }
      }

      this.isPlayersTurn = this.isPlayersTurn && !turnTaken;
    }
  }
}
