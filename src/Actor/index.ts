import { Game, Tile, Vector } from "../engine";
import { Level } from "../Level";

export abstract class Actor {
  position: Vector = [2, 2];
  tiles: Tile[][] = [[]];
  dimensions: Vector = [1, 1];
  drawSize = 1;

  hp = 100;
  maxHp = 100;

  strength = 1;
  ac = 1;

  speed = 1;
  delay = 1;

  constructor(public game: Game) {}

  collides(actor: Actor) {
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
  abstract update(frame: number, currentScene: Level): boolean;
}

