import { Tile } from "./engine";
import { brown, gray } from "./palette";

export type EnvironmentalElement = {
  tile: Tile;
  description: string;
};

export enum Env {
  Wall = 'Wall',
  Door = 'Door',
  Floor = 'Floor',
}

export const Wall: EnvironmentalElement = {
  tile: Tile.from('#', gray[2], gray[6]),
  description: 'A stone wall'
};
Wall.tile.addProperties(['solid', 'wall']);

export const Door: EnvironmentalElement = {
  tile: Tile.from('+', gray[6], brown[7]),
  description: 'An intricately carved wooden door'
};

export const Floor: EnvironmentalElement = {
  tile: Tile.from('.', gray[6], gray[1]),
  description: 'A speckled marble floor'
};

export const environment: Record<Env, EnvironmentalElement> = {
  [Env.Wall]: Wall,
  [Env.Door]: Door,
  [Env.Floor]: Floor,
};
