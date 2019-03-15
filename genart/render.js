function toCanvasCoords(points, width, height, state) {
  return points.map(point => {
    let x = point[0];
    let y = point[1];

    let sx = x * width;
    let sy = height * (1 - y);

    sx = (sx - width/2) * state.scale + width/2;
    sy = (sy - height/2) * state.scale + height/2;

    return [Math.round(sx), Math.round(sy)];
  })
}

function renderPoints(ctx, points, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function renderBg(canvas, state) {
  return new Promise(resolve => {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = state.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    resolve(canvas);
  });
}

function renderFrame(canvas, state) {
  return new Promise(resolve => {
    const ctx = canvas.getContext("2d");

    const bg = parseColor(state.bgColor);
    bg[0] = 255 - bg[0]; bg[1] = 255 - bg[1]; bg[2] = 255 - bg[2];

    ctx.strokeStyle = rgba(bg, 1);
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    resolve(canvas);
  });
}

function parseColor(str) {
  return str.match(/#(..)(..)(..)/).slice(1).map(hex => parseInt(hex, 16));
}

function rgba(rgb, alpha) {
  return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + alpha + ")";
}

function renderMountains(canvas, state) {
  return new Promise(function (resolve) {
    let width = canvas.width;
    let height = canvas.height;

    let mountains = [];
    let N = state.layers;
    let spacing = state.spacing;
    let shift = state.shift;
    for (let i = N; i >= 0; i--) {
      let y = i * spacing;
      let x1 = shift * i;
      let x2 = 1 + shift * i;
      mountains.push(toCanvasCoords(generateMountain(x1, y, x2, y, state), width, height, state));
    }

    const ctx = canvas.getContext("2d");

    let color1 = parseColor(state.color1);
    let color2 = parseColor(state.color2);

    if (!state.fill) {
      let tmp = color1;
      color1 = color2;
      color2 = tmp;
    }

    let step = [(color2[0] - color1[0]) / N, (color2[1] - color1[1]) / N, (color2[2] - color1[2]) / N];

    mountains.forEach((points, i) => {
      let idx = N - i;

      let fill = [color1[0] + step[0] * idx,
        color1[1] + step[1] * idx,
        color1[2] + step[2] * idx];
      let stroke = [color1[0] + step[0] * (N - idx),
        color1[1] + step[1] * (N - idx),
        color1[2] + step[2] * (N - idx)];

      let alpha = state.haze ? (N - idx) / N : 1;

      if (state.stroke) {
        ctx.strokeStyle = rgba(stroke, alpha);
        ctx.lineWidth = state.lineWidth;
      } else {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.01;
      }

      if (state.fill) {
        ctx.fillStyle = rgba(fill, alpha);
      } else {
        ctx.fillStyle = state.bgColor;
      }

      renderPoints(ctx, points, true, true);
    });

    resolve(canvas);
  });
}

function renderSun(canvas, state) {
  return new Promise(resolve => {
    let width = canvas.width;
    let height = canvas.height;

    let ctx = canvas.getContext("2d");

    let cx = randomGenerator.nextFloat(state.sunSize, 1 - state.sunSize) + state.shift * state.layers;
    let cy = 1 - state.sunSize - randomGenerator.nextFloat(0, state.sunSize);

    let color1 = parseColor(state.sunColor1);
    let color2 = parseColor(state.sunColor2);
    let N = state.sunCount;
    let step = [(color2[0] - color1[0]) / N, (color2[1] - color1[1]) / N, (color2[2] - color1[2]) / N];

    generateSun(cx, cy, canvas.height / canvas.width, 1, state)
      .map(circle => toCanvasCoords(circle, width, height, state))
      .forEach((circle, i) => {
        let idx = state.sunCount - i;
        ctx.strokeStyle = rgba([color1[0] + step[0] * idx,
          color1[1] + step[1] * idx,
          color1[2] + step[2] * idx],
          1);
        ctx.lineWidth = state.lineWidth;
        ctx.fillStyle = state.bgColor;
        renderPoints(ctx, circle, true, true);
      });

    resolve(canvas);
  });
}

function render(canvas, state) {
  return renderBg(canvas, state)
    .then(renderSun(canvas, state))
    .then(renderMountains(canvas, state))
    .then(renderFrame(canvas, state));
}
