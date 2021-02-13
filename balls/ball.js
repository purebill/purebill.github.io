import V from "./vector.js";

const O = [0, 0];

export class Ball {
  r;
  m;
  p = O;
  v = O;
  /**@type {[number, number, number, number][]}*/
  treeCells;

  constructor(r, m, p, v) {
    this.r = r;
    this.m = m;
    this.p = p;
    this.v = v;
  }
}

/**
 * @param {Ball} b1 
 * @param {Ball} b2 
 */
export function collide(b1, b2) {
  let n = V.subtract(b1.p, b2.p);
  let v2 = V.subtract(b2.v, b1.v);
  if (V.length(v2) < 1e-9) {
    return [b2.v, b1.v];
  }

  let [v2parallel, v2norm] = V.decompose(v2, n);

  let v1prim = V.mulByScalar(v2parallel, 2 * b2.m / (b1.m + b2.m));
  let v2prim = V.mulByScalar(v2parallel, (b2.m - b1.m) / (b1.m + b2.m));

  let v1 = b1.v;
  return [V.add(v1prim, v1), V.add(V.add(v2prim, v2norm), v1)];
}