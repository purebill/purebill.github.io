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