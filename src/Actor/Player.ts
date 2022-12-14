import { Actor } from ".";
import { DOWN, Game, Layers, LEFT, RIGHT, Tile, UP, vAdd, vDist, Vector, vSub } from "../engine";
import { EnvProperty } from "../environment";
import { Level } from "../Level";
import { red } from "../palette";
import { Random } from "../Random";
import { playArea } from "../UI";

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

export class Player extends Actor {
  private tile = Tile.from('@', red[6]);
  tiles = [[this.tile]];
  viewRadius = 8;

  viewCircle: Vector[] = [];
  lightLevels: number[] = [0, 0.2, 0.6, 0.6];

  name = 'You';

  speed = 1.3;
  inputLag = 5;

  constructor(game: Game, random: Random) {
    super(game, random);
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

  update(frame: number, level: Level) {
    if (frame % this.inputLag === 0) {
      const nextPosition = this.getNextPosition();
      if (nextPosition !== this.position) {
        const actorAtPosition = level.getActorAt(nextPosition);
        if (actorAtPosition) {
          this.attack(actorAtPosition);
          return true;
        } else {
          const levelTile = level.getLevelTileAt(nextPosition);
          if (levelTile && !levelTile.gridTile.env.tile.hasProperty(EnvProperty.Solid)) {
            this.position = nextPosition;
            return true;
          }
        }
      }
    }

    return false;
  }
}
