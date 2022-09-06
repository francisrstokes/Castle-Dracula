import { vAdd, vector, Vector } from "./engine";

export type ScreenRegion = {
  dimensions: Vector;
  offset: Vector;
  translate: (v: Vector) => Vector;
};

export const playArea: ScreenRegion = {
  dimensions: vector(90, 29),
  offset: vector(0, 1),
  translate: (v: Vector) => vAdd(playArea.offset, v)
};

export const descriptionArea: ScreenRegion = {
  dimensions: vector(90, 1),
  offset: vector(0, 0),
  translate: (v: Vector) => vAdd(descriptionArea.offset, v)
};

export const messageArea: ScreenRegion = {
  dimensions: vector(90, 3),
  offset: vector(0, 30),
  translate: (v: Vector) => vAdd(messageArea.offset, v)
};

export const infoArea: ScreenRegion = {
  dimensions: vector(20, 33),
  offset: vector(90, 0),
  translate: (v: Vector) => vAdd(infoArea.offset, v)
};

export const pixelScale = vector(1, 2);

export const gridSize: Vector = [
  playArea.dimensions[0] + infoArea.dimensions[0],
  infoArea.dimensions[1]
];
