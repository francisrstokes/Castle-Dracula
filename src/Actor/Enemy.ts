import { Actor } from ".";
import { Game, Layers, Tile, Vector, vEqual } from "../engine";
import { EnvProperty } from "../environment";
import { Level } from "../Level";
import { playArea } from "../ui";

export type UpdateAIFunction = (self: Enemy, frame: number, level: Level) => void;

export type EnemyConfiguration = {
  name: string;
  description: string;
  speed: number;
  tile: Tile;
  updateAI: UpdateAIFunction;
};

export class Enemy extends Actor {
  name: string;
  description: string;
  speed: number;
  tile: Tile;
  updateAI: UpdateAIFunction;

  constructor(game: Game, config: EnemyConfiguration) {
    super(game);

    this.name = config.name;
    this.description = config.description;
    this.speed = config.speed;
    this.updateAI = config.updateAI;
    this.tile = config.tile;
  }

  onBeforeCommit(frame: number): void {}

  render(frame: number): void {
    // TODO: Is this enemy effected in any way that prevents rendering?
    // Should that happen at the beforeCommit stage?
    this.game.renderer.drawTile(this.tile, Layers.FG, playArea.translate(this.position));
  }

  update(frame: number, level: Level) {
    this.updateAI(this, frame, level);
    return true;
  }

  attemptMove(to: Vector, level: Level) {
    if (!vEqual(to, this.position)) {
      const levelTile = level.getLevelTileAt(to);
      if (levelTile && !levelTile.gridTile.env.tile.hasProperty(EnvProperty.Solid)) {
        this.position = to;
        return true;
      }
    }
    return false;
  }
}

export const exampleAI = (() => {
  enum State {
    Waiting,
    MoveTowardPlayer,
    Attack
  };

  let state = State.Waiting;

  return (self: Enemy, frame: number, level: Level) => {
    switch (state) {
      case State.Waiting: {
        const playerRoom = level.getRoomIndexFromPosition(level.player.position);
        const selfRoom = level.getRoomIndexFromPosition(self.position);

        if (playerRoom === selfRoom && selfRoom >= 0) {
          state = State.MoveTowardPlayer;
          return;
        }
      } break;

      case State.MoveTowardPlayer: {
        const playerRoom = level.getRoomIndexFromPosition(level.player.position);
        const selfRoom = level.getRoomIndexFromPosition(self.position);

        if (playerRoom !== selfRoom) {
          state = State.Waiting;
          return;
        }

        const path = level.pathfindToPlayer(self.position);
        const next = path.length > 1 ? path[1] : self.position;

        if (vEqual(level.player.position, next)) {
          // Attack!
          state = State.Attack;
        } else {
          self.attemptMove(next, level);
        }


        return;
      } break;

      case State.Attack: {
        state = State.Waiting;
      } break;
    }
  };
})();

