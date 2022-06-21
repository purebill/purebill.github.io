export function distanceEuclidean(sx, sy, x, y, w, h) {
  return (sx - x) * (sx - x) + (sy - y) * (sy - y);
}

export function distanceManhatten(sx, sy, x, y, w, h) {
  return Math.abs(sx - x)  + Math.abs(sy - y);
}

export function distanceMinkovski3(sx, sy, x, y, w, h) {
  const dx = Math.abs(sx-x);
  const dy = Math.abs(sy-y);
  return dx*dx*dx + dy*dy*dy;
}

export function distanceChebyshev(sx, sy, x, y, w, h) {
  return Math.max(Math.abs(sx -x), Math.abs(sy -y));
}

export function distanceFlatTorus(sx, sy, x, y, w, h) {
  if (sx - x > w/2) sx = sx - w;
  if (x - sx > w/2) sx = sx + w;
  if (sy - y > h/2) sy = sy - h;
  if (y - sy > h/2) sy = sy + h;
  return (x - sx)*(x - sx) + (y - sy)*(y - sy);
}

/**
 * 
 * @param {{x: number, y: number, color: {r: number, g: number, b: number}}[]} nodes
 * @param {{left: number, top: number, width: number, height: number}} tile
 * @param {(sx: number, sy: number, x: number, y: number, w: number, h: number) => number} distFun 
 * @param {number} randomnessFactor
 * @param {number} width
 * @param {number} height
 * @returns 
 */
export function renderVoronoiDiagram(nodes, tile, distFun, randomnessFactor, width, height) {
  const w = tile.width;
  const h = tile.height;

  let imd = new ImageData(tile.width, tile.height);

  if (nodes.length == 0) {
    return imd;
  }

  let imdIdx = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let i = 0; i < nodes.length; i++) {
        const sx = nodes[i].x;
        const sy = nodes[i].y;

        let randomness = randomnessFactor > 0 
          ? 1 - randomnessFactor + Math.random()*randomnessFactor
          : 1;
        const dist = distFun(sx, sy, x + tile.left, y + tile.top, width, height) * randomness;

        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      // const fadeFactor = 1 - Math.log10((minDist > 10000 ? 10000 : minDist))/4;
      const fadeFactor = 1;
      imd.data[imdIdx + 0] = nodes[minIdx].color.r*fadeFactor;
      imd.data[imdIdx + 1] = nodes[minIdx].color.g*fadeFactor;
      imd.data[imdIdx + 2] = nodes[minIdx].color.b*fadeFactor;
      imd.data[imdIdx + 3] = 255;
      imdIdx += 4;
    }
  }

  return imd;
}
