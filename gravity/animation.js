function animate(v1, v2, t1, t2, shift) {
  v1 = v1.slice(0);
  v2 = v2.slice(0);
  
  let t1s = t1;
  let t2s = t2;

  if (shift < 0) t1s = t1 + (t2 - t1)*-shift;
  if (shift > 0) t2s = t1 + (t2 - t1)*(1-shift);

  const step = v2.map((c, idx) => (c - v1[idx]) / (t2s - t1s));

  return t => {
    if (t <= t1s) return v1;
    if (t >= t2s) return v2;
    return v1.map((c, idx) => c + step[idx] * (t-t1s));
  };
}