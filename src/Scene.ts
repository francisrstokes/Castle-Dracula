// Scene needs to:
// 1. Provide a hook to the draw function, getting the renderer + frame as an input
// 2. Provide a hook to the render effects + rest of the events
//
// The rest can be achieved by subclassing the scene for things like "Text scene",
// "Game scene", "Title scene", "Menu Scene" etc
// Each Game Scene can include things like a HUD, and maybe standardise things like
// camera

import { Game, Layers, Vector } from "./engine"
import { EnvironmentalElement } from "./environment";

export type GridTile = {
  env: EnvironmentalElement,
  position: Vector,
  zPos: Layers
}

export type SceneTiles = Record<Layers, GridTile[]>;

export abstract class Scene {
  layers: SceneTiles = {
    [Layers.BG]: [],
    [Layers.FG]: [],
    [Layers.HUD]: [],
    [Layers.MG]: [],
  };
  tiles: GridTile[] = [];

  constructor(private game: Game) {}

  sparseLoad(tiles: GridTile[]) {
    for (const tile of tiles) {
      this.layers[tile.zPos].push(tile);
    }
  }

  getGame() { return this.game; }

  abstract render(frame: number): void;
  abstract onBeforeCommit(frame: number): void;
  abstract update(frame: number): void;
}
