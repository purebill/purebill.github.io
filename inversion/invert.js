function invert(x, y, r) {
  const d2 = x*x + y*y;
  if (d2 < 1e-12) return [x, y];

  const r2 = r*r;
  const x1 = x / d2 * r2;
  const y1 = y / d2 * r2;
  return [x1, y1];
}

function invertImg(img, tile, x, y, r) {
  const result = new ImageData(tile.width, tile.height);

  for (let row = tile.top; row < tile.top + tile.height; row++) {
    for (let col = tile.left; col < tile.left + tile.width; col++) {
      let [x1, y1] = invert(col - x, row - y, r);
      x1 = Math.round(x1 + x);
      y1 = Math.round(y1 + y);

      if (x1 < 0 || x1 >= img.width || y1 < 0 || y1 > img.height) continue;

      const imgIndex = (x1 + y1 * img.width) * 4;
      
      const rrow = row - tile.top;
      const rcol = col - tile.left;
      const rIndex = (rcol + rrow * tile.width) * 4;

      result.data[rIndex]     = img.data[imgIndex];
      result.data[rIndex + 1] = img.data[imgIndex + 1];
      result.data[rIndex + 2] = img.data[imgIndex + 2];
      result.data[rIndex + 3] = img.data[imgIndex + 3];
    }
  }

  return result;
}

function invertImgLinear(img, tile, x, y, R) {
  const result = new ImageData(tile.width, tile.height);

  for (let row = tile.top; row < tile.top + tile.height; row++) {
    for (let col = tile.left; col < tile.left + tile.width; col++) {
      let [x1, y1] = invert(col - x, row - y, R);
      x1 = x1 + x;
      y1 = y1 + y;

      if (x1 < 0 || x1 >= img.width || y1 < 0 || y1 > img.height) continue;

      const x11 = Math.floor(x1);
      const x12 = Math.ceil(x1);
      const y11 = Math.floor(y1);
      const y12 = Math.ceil(y1);

      const i1 = (x11 + y11 * img.width) * 4;
      const r1 = img.data[i1];
      const g1 = img.data[i1 + 1];
      const b1 = img.data[i1 + 2];
      const a1 = img.data[i1 + 3];

      const i2 = (x12 + y11 * img.width) * 4;
      const r2 = img.data[i2];
      const g2 = img.data[i2 + 1];
      const b2 = img.data[i2 + 2];
      const a2 = img.data[i2 + 3];

      const i3 = (x12 + y12 * img.width) * 4;
      const r3 = img.data[i3];
      const g3 = img.data[i3 + 1];
      const b3 = img.data[i3 + 2];
      const a3 = img.data[i3 + 3];

      const i4 = (x11 + y12 * img.width) * 4;
      const r4 = img.data[i4];
      const g4 = img.data[i4 + 1];
      const b4 = img.data[i4 + 2];
      const a4 = img.data[i4 + 3];

      const r = linearColor(x1, y1, x11, x12, y11, y12, r1, r2, r3, r4);
      const g = linearColor(x1, y1, x11, x12, y11, y12, g1, g2, g3, g4);
      const b = linearColor(x1, y1, x11, x12, y11, y12, b1, b2, b3, b4);
      const a = linearColor(x1, y1, x11, x12, y11, y12, a1, a2, a3, a4);

      const rrow = row - tile.top;
      const rcol = col - tile.left;
      const rIndex = (rcol + rrow * tile.width) * 4;

      result.data[rIndex]     = r;
      result.data[rIndex + 1] = g;
      result.data[rIndex + 2] = b;
      result.data[rIndex + 3] = a;
    }
  }

  return result;
}

function linear(x, a, b, v1, v2) {
  if (Math.abs(b - a) < 1e-6) return v1;
  const p = (x - a) / (b - a);
  return p*v2 + (1-p)*v1;
}

function linearColor(x, y, x1, x2, y1, y2, v1, v2, v3, v4) {
  const v12 = linear(x, x1, x2, v1, v2);
  const v43 = linear(x, x1, x2, v4, v3);
  return Math.round(linear(y, y1, y2, v12, v43));
}