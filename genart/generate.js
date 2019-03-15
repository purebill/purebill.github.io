function generateMountain(x1, y1, x2, y2, state) {
  let points = [[x1, y1]];
    let p = randomGenerator.nextFloat(0.5 - state.wobbliness, 0.5 + state.wobbliness);

  _generateMountain(x1, y1, x2, y2, Math.min(y1, y2), 0);

  points.push([x2, y2]);
  return points;


  function _generateMountain(x1, y1, x2, y2, minY, level) {
    if (level > state.maxLevel) return;

    let size = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    let rndSize = size * Math.pow(2, -level * (1 - state.roughness));
    let noise = state.amplitude * randomGenerator.nextFloat(-rndSize, rndSize);
    let x = x1 * p + x2 * (1 - p);
    let y = Math.max(minY, y1 * p + y2 * (1 - p) + noise);

    _generateMountain(x1, y1, x, y, minY, level + 1);
    points.push([x, y]);
    _generateMountain(x, y, x2, y2, minY, level + 1);
  }
}

function generateSun(cx, cy, xscale, yscale, state) {
  let circles = [];

  for (let i = state.sunCount; i > 0; i--) {
    let r = i / state.sunCount * state.sunSize;

    let circle = [];
    for (let p = 0; p < state.sunPoints; p++) {
      let angle = 2 * Math.PI * p / state.sunPoints;

      let rndSize = r * (state.roughness - 0.5);
      let noise = randomGenerator.nextFloat(-rndSize, rndSize);

      let x = cx + (r + noise) * Math.sin(angle) * xscale;
      let y = cy + (r + noise) * Math.cos(angle) * yscale;

      circle.push([x, y]);
    }

    // close the circle
    circle.push(circle[0]);

    circles.push(circle);
  }

  return circles;
}