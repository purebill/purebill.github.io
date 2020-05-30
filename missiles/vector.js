const V = {};

V.add = (v1, v2) => v1.map((e, idx) => e + v2[idx]);

V.negate = v => v.map(e => -e);

V.subtract = (v1, v2) => V.add(v1, V.negate(v2));

V.length = v => Math.sqrt(v.map(e => e*e).reduce((acc, e) => acc+e, 0));

V.normalize = v => V.mulByScalar(v, 1/V.length(v));

V.mulByScalar = (v, scalar) => v.map(e => e*scalar);

V.dotProduct = (v1, v2) => v1.map((e, idx) => e*v2[idx]).reduce((acc, e) => acc+e, 0);

V.clone = v => v.slice(0);

V.random = (length) => {
  let l = length === undefined ? 1 : length;
  let alpha = Math.random()*Math.PI*2;
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