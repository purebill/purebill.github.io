export class Chart {
  constructor() {
    this.arrays = [];
    this.colors = [];
  }

  add(array, options) {
    array.options = Object.assign({
      color: "black",
      font: "12px serif",
      showValues: false,
      precision: 1,
      maxy: -Infinity,
      miny: Infinity
    }, options);

    if (array.length == 0 || this.arrays.length > 0 && this.arrays[0].length != array.length) throw new Error("Bad size");
    this.arrays.push(array);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.arrays.length == 0) return;

    ctx.save();

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = "gray";
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let a of this.arrays) {
      let minx = Infinity, maxx = -Infinity, miny = a.options.miny, maxy = a.options.maxy;
      for (let xy of a) {
        const x = xy[0];
        const y = xy[1];
        if (Math.abs(x) != Infinity) {
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
        }
        if (Math.abs(y) != Infinity) {
          if (y < miny) miny = y;
          if (y > maxy) maxy = y;
        }
      }

      const dx = 20;
      const dy = 20;
      const w = ctx.canvas.width - 2*dx;
      const h = ctx.canvas.height - 2*dy;

      const xtos = x => {
        x = dx + (x - minx)/(maxx - minx)*w;
        if (x === Infinity) x = dx;
        if (x === -Infinity) x = w;
        return x;
      };

      const ytos = y => {
        y = dy + (y - miny)/(maxy - miny)*h;
        if (y === Infinity) y = h;
        if (y === -Infinity) y = dy;
        return y;
      };

      let x, y;
      ctx.strokeStyle = a.options.color;
      ctx.fillStyle = a.options.color;
      ctx.font = a.options.font;

      ctx.beginPath();
      ctx.moveTo(xtos(a[0][0]), ytos(a[0][1]));
      for (let i = 1; i < a.length; i++) {
        ctx.lineTo(xtos(a[i][0]), ytos(a[i][1]));
      }
      ctx.stroke();

      if (a.options.showValues) {
        const minMarkDist = 20;
        let lastMarkX = xtos(a[0][0]);
        ctx.fillText(a[0][1].toFixed(a.options.precision), xtos(a[0][0]), ytos(a[0][1]));
        ctx.fillText(a[a.length - 1][1].toFixed(a.options.precision), xtos(a[a.length - 1][0]), ytos(a[a.length - 1][1]));
        for (let i = 0; i < a.length; i++) {
          x = xtos(a[i][0]);
          const v = a[i][1];
          y = ytos(v);

          if (i > 0 && i < a.length - 1) {
            if (a[i - 1][1] < v && a[i + 1][1] < v
            || a[i - 1][1] > v && a[i + 1][1] > v) {
              if (x - lastMarkX > minMarkDist) {
                ctx.fillText(v.toFixed(a.options.precision), x, y);
                lastMarkX = x;
              }
            }
          }
        }
      }
    }

    ctx.restore();
  }
}