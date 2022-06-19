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
  //  +-----------+ +-----------+ +-----------+ 
  //  |6        x | | 2       x | |7        x | 
  //  |           | |           | |           | 
  //  |           | |           | |           | 
  //  +-----------+ +-----------+ +-----------+ 
  //  +-----------+ +-----------+ +-----------+
  //  |5        x | | 1       x | | 3       x |
  //  |           | |           | |           |
  //  |           | | o         | |           |
  //  +-----------+ +-----------+ +-----------+
  //  +-----------+ +-----------+ +-----------+ 
  //  |9        x | | 4       x | |8        x | 
  //  |           | |           | |           | 
  //  |           | |           | |           | 
  //  +-----------+ +-----------+ +-----------+ 

  let d1 = (sx - x)*(sx - x) + (sy - y)*(sy - y);
  let d2 = (sx - x)*(sx - x) + (sy - y + h)*(sy - y + h);
  let d3 = (sx - x - w)*(sx - x - w) + (sy - y)*(sy - y);
  let d4 = (sx - x)*(sx - x) + (sy - y - h)*(sy - y - h);
  let d5 = (sx - x + w)*(sx - x + w) + (sy - y)*(sy - y);
  let d6 = (sx - x + w)*(sx - x + w) + (sy - y + h)*(sy - y + h);
  let d7 = (sx - x - w)*(sx - x - w) + (sy - y + h)*(sy - y + h);
  let d8 = (sx - x - w)*(sx - x - w) + (sy - y - h)*(sy - y - h);
  let d9 = (sx - x + w)*(sx - x + w) + (sy - y - h)*(sy - y -h);
  return Math.min(d1, d2, d3, d4, d5, d6, d7, d8, d9);
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
