function renderField(model, ctx) {
  ctx.save();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  let step = 20;
  for (let x = 0; x < ctx.canvas.width; x += step) {
    for (let y = 0; y < ctx.canvas.height; y += step) {
      let p = toWorldCoords([x, y]);
      let f = [0, 0];
      model.forEach(b => {
        let fv = gravityF(p, physics.earth.m, b.p, b.m);
        f[0] += fv[0];
        f[1] += fv[1];
      });

      let dt = 3600 * 1000;
      let f0 = Math.sqrt(f[0]*f[0] + f[1]*f[1]);
      let a = f0 / physics.earth.m;
      let d = Math.min(4e10, a*dt*dt);
      let uf = [f[0] / f0 * d, f[1] / f0 * d];
      let p2 = [p[0] + uf[0], p[1] + uf[1]];

      let p1c = toCanvasCoords(p);
      let p2c = toCanvasCoords(p2)
      
      ctx.moveTo(p1c[0], p1c[1]);
      ctx.lineTo(p2c[0], p2c[1]);
    }
  }
  ctx.stroke();

  ctx.restore();
}

function rnd(min, max) {
  return Math.random()*(max - min) + min;
}

function gravityF(p1, m1, p2, m2) {
  let rSq = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
  let r = Math.sqrt(rSq);
  let cos = (p2[0] - p1[0]) / r;
  let sin = (p2[1] - p1[1]) / r;

  let f = physics.G * m1 * m2 / rSq;
  return [f*cos, f*sin];
}