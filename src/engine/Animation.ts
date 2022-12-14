import { Layers } from "./constants";
import { EventProvider } from "./EventProvider";
import { Game } from "./Game";
import { Tile } from "./Tile";
import { vAdd, Vector } from "./Vector";

export type AnimationTimelineElement = {
  pos: Vector;
  zPos: Layers;
  tile: Tile;
}[]

export class Animation<G extends Game> extends EventProvider {
  timeline: AnimationTimelineElement[];
  animationLength: number;
  pos: Vector;
  active = false;
  loop: boolean;
  frame = 0;
  times: number;
  freezeOnLastFrame = false;
  state = 0;
  isComplete = false;

  constructor(timeline: AnimationTimelineElement[], animationLength: number, pos: Vector, times = 1, loop = false) {
    super();

    this.timeline = timeline;
    this.active = false;
    this.pos = pos;
    this.animationLength = animationLength;
    this.loop = loop;
    this.times = times;
  }

  start() {
    this.active = true;
  }

  stop() {
    this.active = false;
  }

  reset() {
    this.state = 0;
    this.isComplete = false;
    this.active = false;
    this.frame = 0;
  }

  draw(game: G, tileToScreen: (v: Vector) => Vector) {
    if (this.active) {
      this.state = Math.floor(this.frame / (this.animationLength / (this.timeline.length * this.times))) % this.timeline.length;

      const frame = this.timeline[this.state];
      frame.forEach(({tile, zPos, pos}) => {
        const screenPos = tileToScreen(vAdd(pos, this.pos));
        game.renderer.drawTile(tile, zPos, screenPos);
      });

      if (!this.isComplete) {
        if (this.frame + 1 >= this.animationLength) {
          if (this.loop) {
            this.frame = 0;
          } else {
            this.trigger('complete', this.frame);
            if (this.freezeOnLastFrame) {
              this.isComplete = true;
            } else {
              this.reset();
            }
          }
        } else {
          this.frame++;
        }
      }
    }
  }

  clone() {
    return new Animation(
      this.timeline,
      this.animationLength,
      this.pos,
      this.times,
      this.loop
    );
  }
}

