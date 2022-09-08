import { DOWN, Game, Layers, LEFT, RIGHT, Tile, UP, vAdd, vDist, Vector, vEqual, vSqDist, vSub } from "./engine";
import { Level } from "./Level";
import { red } from "./palette";
import { Scene } from "./Scene";
import { playArea } from "./ui";

export abstract class ActorBase {
  // Position     :: Position in grid space
  position: Vector = [2, 2];
  // Tile[][]     :: 2D array of tiles to draw (origin is top left, or Tiles[0][0])
  tiles: Tile[][] = [[]];
  // Dimensions   :: Size taken on grid (for computing collisions)
  dimensions: Vector = [1, 1];
  // DrawSize     :: Size to draw
  drawSize = 1;

  constructor(public game: Game) {}

  collides(actor: ActorBase) {
    const [ax, ay] = this.position;
    const [aw, ah] = this.dimensions;
    const [bx, by] = actor.position;
    const [bw, bh] = actor.dimensions;

    const axw = ax + aw;
    const ayh = ay + ah;
    const bxw = bx + bw;
    const byh = by + bh;

    return (
         (bx >= ax && bx <= axw)    && (by >= ay && by <= ayh)
      || (bxw >= ax && bxw <= axw)  && (by >= ay && by <= ayh)
      || (bx >= ax && bx <= axw)    && (byh >= ay && byh <= ayh)
      || (bxw >= ax && bxw <= axw)  && (byh >= ay && byh <= ayh)
    );
  }

  abstract render(frame: number): void;
  abstract onBeforeCommit(frame: number): void;
  abstract update(frame: number, currentScene: Scene): void;
}

const getCirclePoints = (radius: number) => {
  const origin: Vector = [radius, radius];
  const points: Vector[] = [];

  for (let y = 0; y < radius*2; y++) {
    for (let x = 0; x < radius*2; x++) {
      const dist = vDist(origin, [x, y]);
      if (dist < radius) {
        points.push(vSub([x, y], origin));
      }
    }
  }

  return points;
}

export class Player extends ActorBase {
  private tile = Tile.from('@', red[6]);
  tiles = [[this.tile]];
  viewRadius = 8;

  viewCircle: Vector[] = [];
  lightLevels: number[] = [0, 0.1, 0.2, 0.4, 0.6];

  constructor(game: Game) {
    super(game);

    this.viewCircle = getCirclePoints(this.viewRadius);
  }

  render(frame: number) {
    this.game.renderer.drawTile(this.tiles[0][0], Layers.MG, playArea.translate(this.position));
  }

  onBeforeCommit(frame: number) {

  }

  getNextPosition() {
    const {input} = this.game;
    if (input.keyIsDown('ArrowLeft')) return vAdd(LEFT, this.position);
    if (input.keyIsDown('ArrowRight')) return vAdd(RIGHT, this.position);
    if (input.keyIsDown('ArrowUp')) return vAdd(UP, this.position);
    if (input.keyIsDown('ArrowDown')) return vAdd(DOWN, this.position);
    return this.position;
  }

  update(frame: number, level: Level) {}
}
