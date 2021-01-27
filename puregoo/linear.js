export function linear(x, a, b, v1, v2) {
  if (Math.abs(b - a) < 1e-6) return v1;
  const p = (x - a) / (b - a);
  return p*v2 + (1-p)*v1;
}

export function linearColor(x, y, x1, x2, y1, y2, v1, v2, v3, v4) {
  return Math.round(linear4(x, y, x1, x2, y1, y2, v1, v2, v3, v4));
}

export function linear4(x, y, x1, x2, y1, y2, v1, v2, v3, v4) {
  const v12 = linear(x, x1, x2, v1, v2);
  const v43 = linear(x, x1, x2, v4, v3);
  return linear(y, y1, y2, v12, v43);
}
