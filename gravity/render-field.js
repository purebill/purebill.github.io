function renderField(context) {
  if (!context.state.showField) return;

  let model = context.model;
  let ctx = context.ctx;

  ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  let step = 10;
  let fv = [0, 0];
  let p = [0, 0];
  let p1c = [0, 0];
  let p2c = [0, 0];
  let f = [0, 0];
  let uf = [0, 0];
  let p2 = [0, 0];
  for (let x = 0; x < ctx.canvas.width; x += step) {
    for (let y = 0; y < ctx.canvas.height; y += step) {
      p = toWorldCoords([x, y], p);
      f[0] = 0;
      f[1] = 0;
      model.forEach(b => {
        fv = gravityF(p, physics.earth.m, b.p, b.m, fv);
        f[0] += fv[0];
        f[1] += fv[1];
      });

      let dt = 3600 * 1000;
      let f0 = Math.sqrt(f[0]*f[0] + f[1]*f[1]);
      let a = f0 / physics.earth.m;
      let d = Math.min(4e10, a*dt*dt);
      uf[0] = f[0] / f0 * d;
      uf[1] = f[1] / f0 * d;
      p2[0] = p[0] + uf[0];
      p2[1] = p[1] + uf[1];

      p1c = toCanvasCoords(p, p1c);
      p2c = toCanvasCoords(p2, p2c);
      
      ctx.moveTo(p1c[0], p1c[1]);
      ctx.lineTo(p2c[0], p2c[1]);
    }
  }
  ctx.stroke();
}
