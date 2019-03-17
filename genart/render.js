function toCanvasCoords(points, width, height, state) {
  return points.map(point => {
    let x = point[0];
    let y = point[1];

    let sx = x * width;
    let sy = height * (1 - y);

    sx = (sx - width/2) * state.scale + width/2;
    sy = (sy - height/2) * state.scale + height/2;

    return [Math.round(sx) + state.offsetX, Math.round(sy) + state.offsetY];
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

function renderFrame(canvas, state, scale) {
  return new Promise(resolve => {
    const ctx = canvas.getContext("2d");

    if (state.frameSpacing > 0) {
      ctx.strokeStyle = state.bgColor;
      ctx.lineWidth = (state.frameSpacing + state.frameWidth) * scale;
      let pad = (state.frameSpacing + state.frameWidth) / 2 * scale;   
      ctx.strokeRect(pad, pad, canvas.width - 2*pad, canvas.height - 2*pad);
    }

    if (state.frameWidth > 0) {
      ctx.strokeStyle = state.frameColor;
      ctx.lineWidth = state.frameWidth * scale;
      ctx.strokeRect(state.frameWidth/2 * scale, state.frameWidth/2 * scale, 
        canvas.width - state.frameWidth * scale, canvas.height - state.frameWidth * scale);
    }

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
    let bgColor = parseColor(state.bgColor);

    if (!state.fill) {
      let tmp = color1;
      color1 = color2;
      color2 = tmp;
    }

    let bgColorPart = animate([0], [1], 0, N, 0);
    let strokeAnimation = animate(color2, color1, 0, N, state.colorShift);
    let fillAnimation = animate(color1, color2, 0, N, state.colorShift);

    mountains.forEach((points, i) => {
      let idx = N - i;

      let fill = fillAnimation(idx);
      let stroke = strokeAnimation(idx);
      if (state.haze) {
        let p = bgColorPart(idx);
        fill = fill.map((c, i) => (1-p)*c + p*bgColor[i]);
        stroke = stroke.map((c, i) => (1-p)*c + p*bgColor[i]);
      }

      let alpha = 1;//state.haze ? (N - idx) / N : 1;

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
    let strokeAnimation = animate(color1, color2, 0, N, state.sunColorShift);

    generateSun(cx, cy, canvas.height / canvas.width, 1, state)
      .map(circle => toCanvasCoords(circle, width, height, state))
      .forEach((circle, i) => {
        let idx = state.sunCount - i;
        ctx.strokeStyle = rgba(strokeAnimation(idx), state.sunOpacity);
        ctx.lineWidth = state.lineWidth;
        ctx.fillStyle = ctx.strokeStyle;
        renderPoints(ctx, circle, true, true);
      });

    resolve(canvas);
  });
}

function renderSky(canvas, state) {
  return new Promise(resolve => {
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, canvas.height - 1, 0, 0);
    gradient.addColorStop(0, state.skyColor1);
    if (state.skyColorShift < 0) 
      gradient.addColorStop(-state.skyColorShift, state.skyColor1);
    if (state.skyColorShift > 0) 
      gradient.addColorStop(1 - state.skyColorShift, state.skyColor2);
    gradient.addColorStop(1, state.skyColor2);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    resolve(canvas);
  });
}

function render(canvas, state, scale) {
  return renderBg(canvas, state)
    .then(renderSky(canvas, state))
    .then(renderSun(canvas, state))
    .then(renderMountains(canvas, state))
    .then(renderFrame(canvas, state, scale));
}
