export type Vector = [number, number];

export const vector = (x = 0, y = 0): Vector => [x, y];

export const vAdd = (v1: Vector, v2: Vector): Vector => [v1[0] + v2[0], v1[1] + v2[1]];
export const vAddN = (...vs: Vector[]) => vs.reduce(vAdd, vector(0, 0));
export const vMutAdd = (v1: Vector, v2: Vector) => {
  v1[0] += v2[0];
  v1[1] += v2[1];
};
export const vSub = (v1: Vector, v2: Vector): Vector => [v1[0] - v2[0], v1[1] - v2[1]];
export const vMag = ([x, y]: Vector): number => Math.hypot(x, y);
export const vNorm = (v: Vector): Vector => {
  const m = vMag(v);
  if (m === 0) {
    return [0, 0];
  }
  return [v[0] / m, v[1] / m];
}
export const vScale = (s: number, v: Vector): Vector => [v[0] * s, v[1] * s];
export const vFloor = (v: Vector): Vector => [Math.floor(v[0]), Math.floor(v[1])];
export const vMul = (v1: Vector, v2: Vector): Vector => [v1[0] * v2[0], v1[1] * v2[1]];
export const vEqual = ([x1, y1]: Vector, [x2, y2]: Vector) => x1 === x2 && y1 === y2;
export const vSqDist = ([x1, y1]: Vector, [x2, y2]: Vector) => (x1 - x2)**2 + (y1 - y2)**2;
export const vDist = ([x1, y1]: Vector, [x2, y2]: Vector) => Math.sqrt((x1 - x2)**2 + (y1 - y2)**2);
export const vTaxiDist = ([x1, y1]: Vector, [x2, y2]: Vector) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

export const vInBounds = (lower: Vector, upper: Vector, v: Vector) => {
  const [lx, ly] = lower;
  const [ux, uy] = upper;
  const [x, y] = v;

  return (x >= lx && x <= ux) && (y >= ly && y <= uy);
};
export const vInZeroedBounds = (upper: Vector, v: Vector) => vInBounds([0, 0], upper, v);

export const vContains = (a: Vector[], v: Vector) => a.some(v2 => vEqual(v, v2));
export const vObj = ([x, y]: Vector) => ({ x, y });
export const vKey = ([x, y]: Vector) => x + ',' + y;
export const vFromKey = (key: string): Vector => {
  const ks = key.split(',');
  return [Number(ks[0]), Number(ks[1])];
};

export const LEFT: Vector   = [-1, 0];
export const RIGHT: Vector  = [1, 0];
export const UP: Vector     = [0, -1];
export const DOWN: Vector   = [0, 1];
export const UP_LEFT        = vAdd(UP, LEFT);
export const UP_RIGHT       = vAdd(UP, RIGHT);
export const DOWN_LEFT      = vAdd(DOWN, LEFT);
export const DOWN_RIGHT     = vAdd(DOWN, RIGHT);
