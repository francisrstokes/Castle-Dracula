import { RGB, hex2rgb, linearGradient } from "kandinsky-js";
import { Color } from "./engine";

export const color = (r: number, g: number, b: number, a: number): Color => [r, g, b, a];
export const alpha = ([r, g, b]: Color | RGB, alpha: number = 1): Color => [r, g, b, alpha];
export const hex2rgba = (hex: string, a = 1) => alpha(hex2rgb(hex), a);
export const linearGradientA = (steps: number, from: RGB, to: RGB, a = 1) => (
  linearGradient(steps, from, to).map(c => alpha(c, a))
);

export const toCssRgba = ([r, g, b, a]: Color) => `rgba(${r}, ${g}, ${b}, ${a})`;

export enum Shade {
  Darkest   = 'Darkest',
  Dark      = 'Dark',
  Light     = 'Light',
  Lightest  = 'Lightest',
};

const PaletteSteps = 8;
export type Palette = [Color,Color,Color,Color,Color,Color,Color,Color];

export const gray = linearGradientA(PaletteSteps, hex2rgb('#000000'), hex2rgb('#ffffff')) as Palette;
export const red = linearGradientA(PaletteSteps, hex2rgb('#270000'), hex2rgb('#ff2525')) as Palette;
export const blue = linearGradientA(PaletteSteps, hex2rgb('#0b0027'), hex2rgb('#3725ff')) as Palette;
export const green = linearGradientA(PaletteSteps, hex2rgb('#002713'), hex2rgb('#25ff46')) as Palette;
export const yellow = linearGradientA(PaletteSteps, hex2rgb('#272300'), hex2rgb('#ffff25')) as Palette;
export const cyan = linearGradientA(PaletteSteps, hex2rgb('#002627'), hex2rgb('#25ffff')) as Palette;
export const purple = linearGradientA(PaletteSteps, hex2rgb('#270024'), hex2rgb('#ff25ff')) as Palette;
export const brown = linearGradientA(PaletteSteps, hex2rgb('#271000'), hex2rgb('#694125')) as Palette;

export const allColors = {
  gray,
  red,
  green,
  blue,
  yellow,
  cyan,
  purple,
  brown
};