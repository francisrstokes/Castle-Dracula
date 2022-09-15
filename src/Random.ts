import Rand, {PRNG} from 'rand-seed';

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
    return a + (this.r.next()**exp * (b - a));
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

  bool() {
    return this.random() > 0.5;
  }

  normal() {
    let total = 0;
    for (let i = 0; i < 12; i++) {
      total += this.random();
    }
    return total - 6;
  }

  chooseNormal<T>(a: Array<T>) {
    const n = this.normal();
    const i = Math.floor(mapRange([-6, 6], [0, a.length], n));
    return a[i];
  }
}
