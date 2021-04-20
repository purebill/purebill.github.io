import { Random } from "./random.js";

const epsilon = 1e-6;

const V = {};

V.add = (v1, v2) => v1.map((e, idx) => e + v2[idx]);

V.negate = v => v.map(e => -e);

V.subtract = (v1, v2) => V.add(v1, V.negate(v2));

V.length = v => Math.sqrt(v.map(e => e*e).reduce((acc, e) => acc+e, 0));

V.normalize = v => {
  const l = V.length(v);
  if (l < epsilon) return v;
  return V.mulByScalar(v, 1/l);
}

V.mulByScalar = (v, scalar) => v.map(e => e*scalar);

V.dotProduct = (v1, v2) => v1.map((e, idx) => e*v2[idx]).reduce((acc, e) => acc+e, 0);

V.clone = v => v.slice(0);

const random = new Random();

/**
 * @param {number} length 
 * @param {Random | void} randomSource 
 */
V.random = (length, randomSource) => {
  let l = length === undefined ? 1 : length;
  let alpha = (randomSource || random).nextFloat(0, Math.PI*2);
  return [l * Math.sin(alpha), l * Math.cos(alpha)];
};

V.normal = (v) => {
  let d = V.length(v);
  let vu = V.normalize(v);
  return [d*-vu[1], d*vu[0]];
};

V.rotate = (v, radians) => {
  let x = v[0]*Math.cos(radians) - v[1]*Math.sin(radians);
  let y = v[1]*Math.cos(radians) + v[0]*Math.sin(radians);
  return [x, y];
};

V.alignUp = (vToUp, v) => {
  const l = V.length(vToUp);
  const cos = vToUp[0] / l;
  const sin = vToUp[1] / l;

  let x = v[0]*sin - v[1]*cos;
  let y = v[1]*sin + v[0]*cos;
  
  return [x, y];
};

/**
 * Angle between the vectors in degrees.
 * 
 * @param {number[]} v1 
 * @param {number[]} v2 
 * @returns {number}
 */
V.angle = (v1, v2) => {
  const cos = V.dotProduct(v1, v2)/V.length(v1)/V.length(v2);
  return Math.acos(cos)*180/Math.PI;
};

V.dist = (v1, v2) => V.length(V.subtract(v1, v2));

/**
 * Decomposes the vector v to parallel and normal components along vector n.
 * 
 * @param {number[]} v 
 * @param {number[]} n 
 */
V.decompose = (v, n) => {
  const n0 = V.normalize(n);
  const l = V.length(v);

  const cos = V.dotProduct(v, n) / l / V.length(n);
  const parallel = V.mulByScalar(n0, cos*l);
  const norm = V.subtract(v, parallel);
  return [parallel, norm];
}

/**
 * Project v to toV and return the projectec component.
 * 
 * @param {number[]} v 
 * @param {number[]} toV 
 */
V.project = (v, toV) => V.dotProduct(v, toV) / V.length(toV);

/**
 * @returns whenther point2 is behind point1 that looks to v1 direction.
 */
V.behind = (v1, point1, point2) => {
  const n = V.normal(v1);
  if (Math.abs(n[0]) < epsilon) return point2[1] < Math.sign(n[1])*point1[1];

  const x2 = point2[0];
  const y2 = n[1] * (x2 - point1[0]) / n[0] + point1[1];

  const x1 = v1[0] + point1[0];
  const y1 = n[1] * (x1 - point1[0]) / n[0] + point1[1];

  return Math.sign(y2-point2[1]) != Math.sign(y1-point1[1]);
};

export default V;