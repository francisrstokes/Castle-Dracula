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
};

export enum EnvProperty {
  Wall = 'Wall',
  Solid = 'Solid',
  Door = 'Door',
  Floor = 'Floor',
}

export const Wall: EnvironmentalElement = {
  tile: Tile
    .from('#', gray[2], gray[6])
    .addProperties([EnvProperty.Wall, EnvProperty.Solid]),
  description: 'A stone wall'
};

export const Door: EnvironmentalElement = {
  tile: Tile
    .from('+', gray[6], brown[7])
    .addProperties([EnvProperty.Door]),
  description: 'An intricately carved wooden door'
};

export const Floor: EnvironmentalElement = {
  tile: Tile
    .from('.', gray[6], gray[1])
    .addProperties([EnvProperty.Floor]),
  description: 'A speckled marble floor'
};

export const environment: Record<Env, EnvironmentalElement> = {
  [Env.Wall]: Wall,
  [Env.Door]: Door,
  [Env.Floor]: Floor,
};
