let state = {
  scale: 1,
  timeScale: 1,
  paused: false,
  createEarthMass: 1,
  createStatic: false,
  modelSecondsPerRealSecond: 3600 * 24 * 10,
  modelStepSeconds: 3600 * 20
};

let physics = {
  G: 6.67e-11,
  width: 1e12, // m
  height: 1e12, // m
  sun: {
    m: 2e30 // kg
  },
  earth: {
    m: 6e24, // kg
    orbit: {
      size: 150e9, // m
      velocity: 30000 // m/s
    }
  },
  mars: {
    m: 6.4e24, // kg
    orbit: {
      size: 228e9, // m
      velocity: 24000 // m/s
    }
  },
  mercury: {
    m: 3.3e23, // kg
    orbit: {
      size: 58e9, // m
      velocity: 47000 // m/s
    }
  },
  venus: {
    m: 4.87e24,
    orbit: {
      size: 108e9,
      velocity: 35000
    }
  }
};

let model = [];
let ship = null;
let calcFutureForIdx = null;

function selectShip(b) {
  model.filter(b => b === ship).forEach(b => b.ship = false);
  ship = b;
  ship.ship = true;
}

let canvas = document.createElement("canvas");
canvas.width  = window.innerWidth - 50;
canvas.height = window.innerHeight - 50;
canvas.style.width = canvas.width + "px";
canvas.style.height = canvas.height + "px";
canvas.style.display = "";

let otherCanvas = document.createElement("canvas");
otherCanvas.width = canvas.width;
otherCanvas.height = canvas.height;
otherCanvas.style.width = otherCanvas.width + "px";
otherCanvas.style.height = otherCanvas.height + "px";
otherCanvas.style.display = "none";

document.body.appendChild(canvas);
document.body.appendChild(otherCanvas);

function swapBuffers() {
  return;
  canvas.style.display = "";
  otherCanvas.style.display = "none";
  let tmp = canvas;
  canvas = otherCanvas;
  otherCanvas = tmp;
}

let start, last;
function loop(ts) {
  if (!start) {
    start = ts;
    last = ts;
  }

  renderFrame(ts, ts - last);
  last = ts;

  swapBuffers();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

StateUi(state);
initModel();

let renderCallbacks = [];

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

function renderFrame(t, sinceLastTimeMs) {
  if (!state.paused) {
    let sinceLastTimeSeconds = sinceLastTimeMs / 1000;
    let dt = state.modelStepSeconds;
    let steps = Math.ceil(sinceLastTimeSeconds * state.modelSecondsPerRealSecond / dt * state.timeScale);
    for (let i = 0; i < steps; i++) {
      progressModel(model, dt);
    }
  }

  model.forEach(b => {
    if (b.static) return;

    if (b.trail.length == 0) b.trail.push([b.p[0], b.p[1]]);
    else {
      let p1 = toCanvasCoords(b.p);
      let p2 = toCanvasCoords(b.trail[0]);
      let d = dist(p1, p2);
      if (d > 10) b.trail.unshift([b.p[0], b.p[1]]);
    }
    if (b.trail.length > 20) b.trail.pop();
  });

  let ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderField(model, ctx);

  ctx.save();
  renderOrbits(ctx);
  ctx.restore();

  ctx.save();
  renderModel(model, ctx);
  ctx.restore();

  if (calcFutureForIdx != null) {
    let futureModel = clone(model);
    futureModel[calcFutureForIdx].static = false;

    for (let i = 0; i < 100; i++) {
      let dt = 360000;
      progressModel(futureModel, dt);
      ctx.save();
      ctx.globalAlpha = 0.3;
      renderModel(futureModel.filter((b, idx) => idx == calcFutureForIdx), ctx, true);
      ctx.restore();
    }
  }

  renderCallbacks.forEach(callback => {
    ctx.save();
    callback.call(null, t, ctx);
    ctx.restore();
  });
}

function renderOrbits(ctx) {
  let c = toCanvasCoords([0, 0]);
  ["mercury", "venus", "earth", "mars"].forEach(planet => {
    let o = toCanvasCoords([physics[planet].orbit.size, 0]);
    let r = Math.sqrt(Math.pow(c[0] - o[0], 2) + Math.pow(c[1] - o[1], 2));
    ctx.strokeStyle = "#999999";
    ctx.beginPath();
    ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function line(ctx, x1, y1, x2, y2, color, lineWidth) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth ? lineWidth : 1;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function renderTrail(ctx, b) {
  let pScreen = toCanvasCoords(b.p);
  ctx.lineWidth = 1;
  if (b.trail.length > 1) {
    let c1 = parseColor(b.color);
    let c2 = [255, 255, 255];
    let ca = animate(c1, c2, 0, b.trail.length, 0.3);
    let alpha = animate([1], [0], 0, b.trail.length - 1, 0.3);

    ctx.beginPath();
    ctx.moveTo(pScreen[0], pScreen[1]);
    for (let i = 0; i < b.trail.length; i++) {
      let p = toCanvasCoords(b.trail[i]);

      // ctx.strokeStyle = rgba(ca(i), 1);
      ctx.strokeStyle = rgba(c1, alpha(i));
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
    }
  }
}

function renderBody(ctx, b) {
  let color = b.selected ? "#00ff00" : (b.ship ? "#00ffff" : b.color);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  let pScreen = toCanvasCoords(b.p);
  ctx.fillRect(pScreen[0] - 5, pScreen[1] - 5, 10, 10);
  if (b.jet.left) line(ctx, pScreen[0] - 5, pScreen[1] - 5, pScreen[0] - 5, pScreen[1] + 5, "#ff0000", 5);
  if (b.jet.right) line(ctx, pScreen[0] + 5, pScreen[1] - 5, pScreen[0] + 5, pScreen[1] + 5, "#ff0000", 5);
  if (b.jet.top) line(ctx, pScreen[0] - 5, pScreen[1] - 5, pScreen[0] + 5, pScreen[1] - 5, "#ff0000", 5);
  if (b.jet.bottom) line(ctx, pScreen[0] - 5, pScreen[1] + 5, pScreen[0] + 5, pScreen[1] + 5, "#ff0000", 5);
}

function renderModel(model, ctx, future) {
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#00ff00";

  if (!future) model.forEach(b => renderTrail(ctx, b));
  model.forEach(b => renderBody(ctx, b));
}

let aspect = canvas.height / canvas.width;
function toCanvasCoords(p) {
  let x = aspect * state.scale * canvas.width / physics.width * p[0] + canvas.width / 2;
  let y = canvas.height / 2 - state.scale * canvas.height / physics.height * p[1];
  return [x, y];
}

function toWorldCoords(p) {
  let x = (p[0] - canvas.width / 2)/aspect/state.scale/canvas.width*physics.width;
  let y = (canvas.height / 2 - p[1])/state.scale/canvas.height*physics.height;
  return [x, y];
}

function rgba(rgb, alpha) {
  return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + alpha + ")";
}

function parseColor(str) {
  return str.match(/#(..)(..)(..)/).slice(1).map(hex => parseInt(hex, 16));
}

function progressModel(model, dt) {
  model.forEach(b => {
    b.a = [b.f[0] / b.m, b.f[1] / b.m];

    if (b.static) return;

    b.p[0] += b.v[0] * dt;
    b.p[1] += b.v[1] * dt;
  });

  for (let i = 0; i < model.length; i++) {
    let b1 = model[i];

    for (let j = i+1; j < model.length; j++) {
      let b2 = model[j];

      let rSq = Math.pow(b2.p[0] - b1.p[0], 2) + Math.pow(b2.p[1] - b1.p[1], 2);
      let r = Math.sqrt(rSq);
      let cos = (b2.p[0] - b1.p[0]) / r;
      let sin = (b2.p[1] - b1.p[1]) / r;

      let f = physics.G * b1.m * b2.m / rSq;
      let fV = [f*cos, f*sin];

      b1.a[0] += fV[0] / b1.m;
      b1.a[1] += fV[1] / b1.m;

      b2.a[0] -= fV[0] / b2.m;
      b2.a[1] -= fV[1] / b2.m;
    }

    if (!b1.static) {
      b1.v[0] += b1.a[0] * dt;
      b1.v[1] += b1.a[1] * dt;
    }
  }
}

function initModel() {
  let sun = new Body([0, 0], physics.sun.m, [0, -physics.earth.orbit.velocity/2], "#ffff00");
  sun.static = true;
  model.push(sun);

  ["mercury", "venus", "earth", "mars"].forEach(planet => {
    model.push(new Body([physics[planet].orbit.size, 0], physics[planet].m, [0, physics[planet].orbit.velocity], "#0000ff"));
  });
}

function Body(p, m, v, color) {
  this.p = p;
  this.m = m;
  this.v = v;
  this.color = color;
  this.f = [0, 0];

  this.jet = {
    left: false,
    right: false,
    top: false,
    bottom: false
  };
  this.static = false;
  this.trail = [];
}

let newBody = null;
let mouseMoveCallbackIdx = null;
window.onmousedown = e => {
  if (e.button != 0) return;
  if (e.target != canvas) return;

  let selected = model.filter(b => b.selected);
  if (selected.length > 0) {
    selectShip(selected[0]);
    return;
  }

  let screenP = [e.clientX, e.clientY];
  newBody = new Body(toWorldCoords(screenP), physics.earth.m * Math.pow(10, state.createEarthMass), [0, 0], "#ff00ff");

  newBody.screenP = newBody.client = screenP;
  newBody.static = true;
  calcFutureForIdx = model.push(newBody) - 1;

  mouseMoveCallbackIdx = renderCallbacks.push((t, ctx) => {
    if (newBody == null) return;

    line(ctx, newBody.screenP[0], newBody.screenP[1], newBody.client[0], newBody.client[1], "#000000");
  }) - 1;
};

window.onmousemove = e => {
  if (newBody == null) {
    model.forEach(b => {
      let screenP = toCanvasCoords(b.p);
      let d = Math.sqrt(Math.pow(screenP[0] - e.clientX, 2) + Math.pow(screenP[1] - e.clientY, 2));
      if (d < 10) {
        if (!b.selected) {
          b.selected = true;
        }
      } else if (b.selected) {
        b.selected = false;
      }
    });

    return;
  }

  newBody.client = [e.clientX, e.clientY];

  newBody.v[0] = (newBody.screenP[0] - e.clientX) * physics.earth.orbit.velocity / 50;
  newBody.v[1] = (e.clientY - newBody.screenP[1]) * physics.earth.orbit.velocity / 50;
};

window.onmouseup = e => {
  if (e.button != 0) return;
  if (newBody == null) return;

  newBody.static = state.createStatic;
  delete newBody.client;
  delete newBody.screenP;
  newBody = null;
  renderCallbacks = renderCallbacks.splice(mouseMoveCallbackIdx, 1);
  calcFutureForIdx = null;
};

window.oncontextmenu = (e) => {
  state.paused = !state.paused;
  if (!state.paused) requestAnimationFrame(loop);
  e.preventDefault();
};

var mousewheelevt = (/Firefox/i.test(navigator.userAgent))
  ? "DOMMouseScroll"
  : "mousewheel";

if (window.attachEvent)
  document.body.attachEvent("on" + mousewheelevt, onmousewheel);
else if (window.addEventListener)
  document.body.addEventListener(mousewheelevt, onmousewheel, false);

function onmousewheel(e) {
  var zoomIn = e.detail ? e.detail < 0 : e.deltaY < 0;
  state.scale = Math.max(0, state.scale * (zoomIn ? 1.1 : 1/1.1));
  StateUi.updateUi();
  e.preventDefault();
}

window.onkeydown = (e) => {
  if (ship == null) return;

  let unitForce = 2e22 / state.timeScale;

  let handled = true;
  switch (e.code) {
    case "ArrowLeft":
      ship.f[0] = -unitForce;
      ship.jet.right = true;
      e.preventDefault();
      break;
    case "ArrowRight":
      ship.f[0] = unitForce;
      ship.jet.left = true;
      e.preventDefault();
      break;
    case "ArrowUp":
      ship.f[1] = unitForce;
      ship.jet.bottom = true;
      e.preventDefault();
      break;
    case "ArrowDown":
      ship.f[1] = -unitForce;
      ship.jet.top = true;
      e.preventDefault();
      break;
    case "Delete":
      if (ship !== null) {
        model = model.filter(b => b !== ship);
        ship = null;
      }
      break;
    default:
      handled = false;
  }
  // if (handled) calcFutureForIdx = model.indexOf(ship);
};

window.onkeyup = (e) => {
  if (ship == null) return;
  
  let handled = true;
  switch (e.code) {
    case "ArrowLeft":
    case "ArrowRight":
      ship.f[0] = 0;
      ship.jet.left = ship.jet.right = false;
      e.preventDefault();
      break;
    case "ArrowUp":
    case "ArrowDown":
      ship.f[1] = 0;
      ship.jet.top = ship.jet.bottom = false;
      e.preventDefault();
      break;
    default:
      handled = false;
  }
  // if (handled) calcFutureForIdx = null;
};