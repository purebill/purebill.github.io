const Vector = {};

Vector.add = function (v1, v2) {
  return v1.map((e, idx) => e + v2[idx]);
};

Vector.negate = function (v) {
  return v.map(e => -e);
};

Vector.subtract = function (v1, v2) {
  return Vector.add(v1, Vector.negate(v2));
};

Vector.length = function (v) {
  return Math.sqrt(v.map(e => e*e).reduce((acc, e) => acc+e, 0));
};

Vector.normalize = function (v) {
  return Vector.mulByScalar(v, 1/Vector.length(v));
};

Vector.mulByScalar = function (v, scalar) {
  return v.map(e => e*scalar);
};