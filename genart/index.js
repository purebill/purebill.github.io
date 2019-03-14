let randomGenerator = new Random();

let state = {
  width: 800,
  height: 600,
  roughness: 0.7,
  amplitude: 0.3,
  maxLevel: 10,
  layers: 30,
  spacing: 0.03,
  shift: 0,
  scale: 1,
  wobbliness: 0,
  seed: randomGenerator.seed,
  bgColor: "#ffffff",
  color1: "#ffffff",
  color2: "#000000",
  stroke: true,
  fill: true,
  lineWidth: 1
};

function getState() {
  return state;
}

function renderPreview() {
  let canvas = $("canvas");
  canvas.width = state.width;
  canvas.height = state.height;
  render(canvas);
}

function setState(newState) {
  state = newState;
  randomGenerator = new Random(state.seed);
  updateUi();
  renderPreview();
}

if (!State.init(getState, setState)) {
  updateUi();
  renderPreview();
}

function $(id) {
  return document.getElementById(id);
}

function random(min, max) {
  return randomGenerator.nextFloat(min, max);
}

function generateModel(x1, y1, x2, y2) {
  let points = [[x1, y1]];
  let p = randomGenerator.nextFloat(0.5 - state.wobbliness, 0.5 + state.wobbliness);
  _generateModel(x1, y1, x2, y2, Math.min(y1, y2), points, 0, p);
  points.push([x2, y2]);
  return points;
}

function _generateModel(x1, y1, x2, y2, minY, points, level, p) {
  if (level > state.maxLevel) return;

  // let rndSize = Math.exp( - level * (1 - state.roughness));
  let size = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  let rndSize = size * Math.pow(2, -level * (1 - state.roughness));
  let noise = state.amplitude * random(-rndSize, rndSize);

  let x = x1 * p + x2 * (1 - p);
  let y = Math.max(minY, y1 * p + y2 * (1 - p) + noise);

  _generateModel(x1, y1, x, y, minY, points, level + 1, p);
  points.push([x, y]);
  _generateModel(x, y, x2, y2, minY, points, level + 1, p);
}

function toCanvasCoords(points) {
  return points.map(point => {
    let x = point[0];
    let y = point[1];

    let sx = x * state.width;
    let sy = state.height * (1 - y);

    sx = (sx - state.width/2) * state.scale + state.width/2;
    sy = (sy - state.height/2) * state.scale + state.height/2;

    return [Math.round(sx), Math.round(sy)];
  })
}

function renderPoints(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
  ctx.fill();
  ctx.stroke();
}

function render(canvas) {
  randomGenerator = new Random(state.seed);

  let models = [];
  let N = state.layers;
  let spacing = state.spacing;
  let shift = state.shift;
  for (let i = N; i >= 0; i--) {
    let y = i * spacing;
    let x1 = shift * i;
    let x2 = 1 + shift * i;
    models.push(toCanvasCoords(generateModel(x1, y, x2, y)));
  }

  let ctx = canvas.getContext("2d");

  ctx.fillStyle = state.bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let color1 = state.color1.match(/#(..)(..)(..)/).slice(1).map(hex => parseInt(hex, 16));
  let color2 = state.color2.match(/#(..)(..)(..)/).slice(1).map(hex => parseInt(hex, 16));
  let step = [(color2[0] - color1[0]) / N, (color2[1] - color1[1]) / N, (color2[1] - color1[1]) / N];

  models.forEach((points, idx) => {
    let fg = [color1[0] + step[0] * idx, color1[1] + step[1] * idx, color1[2] + step[2] * idx];
    let bg = [color1[0] + step[0] * (N - idx), color1[1] + step[1] * (N - idx), color1[2] + step[2] * (N - idx)];
    if (state.fill) {
      ctx.fillStyle = "rgb(" + bg[0] + ", " + bg[1] + ", " + bg[2] +")";
    } else {
      ctx.fillStyle = state.bgColor;
    }
    ctx.lineWidth = state.lineWidth;
    if (!state.stroke) {
      ctx.strokeStyle = state.bgColor;
      ctx.lineWidth = 0.01;
    }
    renderPoints(ctx, points)
  });
}

function updateStateAndRender() {
  document.querySelectorAll("input[type=range]").forEach(it => {
    let type = it.dataset.type;
    switch (type) {
      case "float":
        state[it.id] = parseFloat(it.value);
        break;
      default:
        state[it.id] = parseInt(it.value);
        break;
    }
  });

  document.querySelectorAll("input[type=color]").forEach(it => {
    state[it.id] = it.value;
  });

  document.querySelectorAll("input[type=checkbox]").forEach(it => {
    state[it.id] = it.checked;
  });

  State.clear();
  renderPreview();
}

function updateUi() {
  document.querySelectorAll("input[type=range]").forEach(it => {
    $(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=color]").forEach(it => {
    $(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=checkbox]").forEach(it => {
    $(it.id).checked  = state[it.id];
  });
}

$("save").onclick = () => {
  State.save();
};

$("reset").onclick = () => {
  State.clear();

  let randomGenerator = new Random();
  state.seed = randomGenerator.seed;

  renderPreview();
};

document.querySelectorAll("input[type=range]").forEach(it => it.oninput = updateStateAndRender);
document.querySelectorAll("input[type=color]").forEach(it => it.onchange = updateStateAndRender);
document.querySelectorAll("input[type=checkbox]").forEach(it => it.onchange = updateStateAndRender);