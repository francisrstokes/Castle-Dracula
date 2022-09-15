import {RGB} from 'kandinsky-js'
import { Color, Vector } from './engine'

export type Nullable<T> = T | null;
export type Dice = {
  n: number;
  sides: number;
  base: number;
}

export const rgba = (rgb: RGB, alpha = 1): Color => [...rgb, alpha];

export const array = <T>(length: number, genFn: (index: number) => T): T[] => (
  Array.from({length}, (_, i) => genFn(i))
);

export const lerp = ([a, b]: Vector, t: number) => a + (b - a) * t;
export const mapRange = (from: Vector, to: Vector, v: number) => lerp(to, (v - from[0]) / (from[1] - from[0]));
