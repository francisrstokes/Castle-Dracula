import { ActorBase } from ".";
import { Game, Tile, Vector } from "../engine";
import { Scene } from "../Scene";

export type MovementFn = (self: Enemy, currentScene: Scene, frame: number) => Vector;
export type AttackFn = (self: Enemy, currentScene: Scene, frame: number) => void;

export type EnemyConfiguration = {
  name: string;
  description: string;
  speed: number;
  tile: Tile;
  movementFn: MovementFn;
  attackFn: AttackFn;
};

export class Enemy extends ActorBase {
  name: string;
  description: string;
  speed: number;
  tile: Tile;
  movementFn: MovementFn;
  attackFn: AttackFn;

  constructor(game: Game, config: EnemyConfiguration) {
    super(game);

    this.name = config.name;
    this.description = config.description;
    this.speed = config.speed;
    this.movementFn = config.movementFn;
    this.attackFn = config.attackFn;
    this.tile = config.tile;
  }

  onBeforeCommit(frame: number): void {
    
  }

  render(frame: number): void {
    // Is this enemy effected in any way that prevents rendering?
    // Should that happen at the beforeCommit stage?
  }

  update(frame: number, currentScene: Scene): void {
    // Apply movement behaviour
    // Apply attack behaviour
  }
}
