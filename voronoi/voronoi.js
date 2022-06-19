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

export function distanceFlatTorusOld(sx, sy, x, y, w, h) {
  let d,l;

  const dx = x - sx;
  const dy = y - sy;

  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    // same point
    d = 0;
    l = 0;
  }
  else if (Math.abs(dx) < 1e-6) {
    // vertical line
    d = Math.abs(dy);
    l = h;
  }
  else if (Math.abs(dy) < 1e-6) {
    // horizontal line
    d = Math.abs(dx);
    l = w;
  }
  else {
    // x(t) = sx + t*(x - sx)
    // y(t) = sy + t*(y - sy)
    //
    // (a)------(b)
    //  |        |
    //  |        |
    // (c)------(d)

    // TODO: handle corners

    let foundPoints = 0;
    let rx1, ry1, rx2, ry2;

    let t_ab = (0 - sy) / dy;
    let x_ab = sx + t_ab * dx;
    if (x_ab >= 0 && x_ab <= w) {
      rx1 = x_ab;
      ry1 = 0;
      foundPoints++;
    }

    let t_cd = (h - sy) / dy;
    let x_cd = sx + t_cd * dx;
    if (x_cd >= 0 && x_cd <= w) {
      if (foundPoints > 0) {
        rx2 = x_cd;
        ry2 = h;
      } else {
        rx1 = x_cd;
        ry1 = h;
      }
      foundPoints++;
    }

    if (foundPoints < 2) {
      let t_ac = (0 - sx) / dx;
      let y_ac = sy + t_ac * dy;
      if (y_ac >= 0 && y_ac <= h) {
        if (foundPoints == 0 || Math.abs(rx1) >= 1e-6 || Math.abs(ry1 - y_ac) >= 1e-6) {
          if (foundPoints > 0) {
            rx2 = 0;
            ry2 = y_ac;
          } else {
            rx1 = 0;
            ry1 = y_ac;
          }
          foundPoints++;
        }
      }
    }

    if (foundPoints < 2) {
      let t_bd = (w - sx) / dx;
      let y_bd = sy + t_bd * dy;
      if (y_bd >= 0 && y_bd <= h) {
        if (foundPoints == 0 || Math.abs(rx1 - w) >= 1e-6 || Math.abs(ry1 - y_bd) >= 1e-6) {
          if (foundPoints > 0) {
            rx2 = w;
            ry2 = y_bd;
          } else {
            rx1 = w;
            ry1 = y_bd;
          }
          foundPoints++;
        }
      }
    }

    d = Math.sqrt(dx*dx + dy*dy);
    l = Math.sqrt((rx2 - rx1)*(rx2 - rx1) + (ry2 - ry1)*(ry2 - ry1));
    
    if (l < d) throw new Error("Bad state");
  }

  return Math.min(d, l - d);
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
