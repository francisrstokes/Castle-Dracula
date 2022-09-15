import Rand, {PRNG} from 'rand-seed';
import { StatRange } from './Actor';
import { Dice, mapRange } from './util';

export type RandomChoice<T> = {
  index: number;
  value: T;
}

export class Random {
  private r: Rand;

  constructor(seed: number) {
    this.r = new Rand(seed.toString(), PRNG.xoshiro128ss);
  }

  between(a: number, b: number, exp = 1) {
    return a + (this.random(exp) * (b - a));
  }

  intBetween(a: number, b: number, exp = 1) {
    return Math.floor(this.between(a, b, exp));
  }

  random(exp = 1) {
    return this.r.next()**exp;
  }

  chooseWithIndex<T>(array: Array<T>, exp = 1): RandomChoice<T> {
    const index = this.intBetween(0, array.length, exp);
    const value = array[index];
    return { index, value };
  }

  choose<T>(array: Array<T>, exp = 1) {
    return this.chooseWithIndex(array, exp).value;
  }

  chooseAndSplice<T>(array: Array<T>, exp = 1) {
    const {value, index} = this.chooseWithIndex(array, exp);
    array.splice(index, 1);
    return value;
  }

  shuffle<T>(array: Array<T>, exp = 1) {
    const indices = Array.from({length: array.length}, (_, i) => i);
    const out: Array<T> = [];
    while (indices.length > 0) {
      const {index, value} = this.chooseWithIndex(indices, exp);
      indices.splice(index, 1);
      out.push(array[value]);
    }
    return out;
  }

  bool(percentChance = 0.5) {
    return this.random() <= percentChance;
  }

  diceRoll({n, sides, base}: Dice) {
    let total = base;
    for (let i = 0; i < n; i++) {
      total += this.intBetween(1, sides + 1);
    }
    return total;
  }

  fromRange(stat: StatRange) {
    return this.between(stat.min, stat.max);
  }

  fromRangeInt(stat: StatRange) {
    return this.intBetween(stat.min, stat.max + 1);
  }

  normal() {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      total += this.random();
    }
    return total - 6;
  }

  normalBetween(min: number, max: number) {
    return mapRange([-6, 6], [min, max], this.normal());
  }

  normalIntBetween(min: number, max: number) {
    return Math.floor(this.normalBetween(min, max + 1));
  }

  chooseNormal<T>(a: Array<T>) {
    const n = this.normal();
    const i = Math.floor(mapRange([-6, 6], [0, a.length], n));
    return a[i];
  }
}
