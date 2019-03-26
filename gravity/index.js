const physics = {
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

let state = {
  scale: 1,
  timeScale: 1,
  paused: false,
  createEarthMass: 1,
  createStatic: false,
  modelSecondsPerRealSecond: 3600 * 24 * 10,
  modelStepSeconds: 3600 * 20,
  showField: false,
  model: [],
  ship: null,
  autopilot: {}
};
let defaultState = clone(state);

let calcFutureForIdx = null;

let canvas = document.createElement("canvas");
let aspect;
function onResize() {
  canvas.width = window.innerWidth - 50;
  canvas.height = window.innerHeight - 50;
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
  canvas.style.display = "";
  canvas.style.position = "fixed";
  canvas.style.left = 0;
  canvas.style.top = 0;

  aspect = canvas.height / canvas.width;
}
window.onresize = onResize;
onResize();
document.body.appendChild(canvas);

let start, last;
function loop(ts) {
  if (!start) {
    start = ts;
    last = ts;
  }

  renderFrame(ts, ts - last);
  last = ts;

  requestAnimationFrame(loop);
}

let loaded = false;
let saved = localStorage.getItem("state");
if (saved) {
  try {
    let savedState = JSON.parse(saved);
    Object.keys(savedState).forEach(k => state[k] = savedState[k]);
    state.model = state.model.map(o => Object.assign(new Body(), o));
    if (state.ship) state.ship = state.model.filter(b => b.ship)[0];
    loaded = true;
  } catch (e) {}
}
if (!loaded) initModel();
StateUi(state);
requestAnimationFrame(loop);

setInterval(() => localStorage.setItem("state", JSON.stringify(state)), 1000);

function selectShip(b) {
  state.model.filter(b => b === state.ship).forEach(b => b.ship = false);
  state.ship = b;
  state.ship.ship = true;
}

function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

function dist(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

let renderPipeline = [renderFps, renderField, renderOrbits, renderModel, renderFuture];

function renderFrame(t, sinceLastTimeMs) {
  if (!state.paused) {
    let sinceLastTimeSeconds = sinceLastTimeMs / 1000;
    let dt = state.modelStepSeconds;
    let steps = Math.ceil(sinceLastTimeSeconds * state.modelSecondsPerRealSecond / dt * state.timeScale);
    for (let i = 0; i < steps; i++) {
      progressModel(state.model, dt);
    }
  }

  state.model.forEach(b => {
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

  let context = {
    ctx,
    sinceLastTimeMs,
    model: state.model,
    t,
    state
  };

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderPipeline.forEach(callback => {
    ctx.save();
    callback.call(null, context);
    ctx.restore();
  });
}

const fpsAveraging = 0.3;
let fps = 0;
let lastFpsUpdate = 0;
let framesRendered = 0;
function renderFps(context) {
  let passed = context.t - lastFpsUpdate;

  if (passed > 500) {
    fps = (1-fpsAveraging) * fps + fpsAveraging * (framesRendered * 1000 / passed);
    lastFpsUpdate = context.t;
    framesRendered = 0;
  }
  framesRendered++;

  let ctx = context.ctx;
  ctx.fillStyle = "#999999";
  ctx.font = "15px sans-serif";
  let text = Math.round(fps).toString() + " FPS";
  ctx.fillText(text, ctx.canvas.width - 50, 20, 50);
}

function renderOrbits(context) {
  let ctx = context.ctx;
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
    let alpha = animate([1], [0], 0, b.trail.length - 1, 0.3);

    ctx.beginPath();
    ctx.moveTo(pScreen[0], pScreen[1]);
    for (let i = 0; i < b.trail.length; i++) {
      let p = toCanvasCoords(b.trail[i]);

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

  const size = 10;
  if (b.jet.left) line(ctx, pScreen[0] - 5, pScreen[1] - 5, pScreen[0] - 5, pScreen[1] + 5, "#ff0000", Math.random()*size + 1);
  if (b.jet.right) line(ctx, pScreen[0] + 5, pScreen[1] - 5, pScreen[0] + 5, pScreen[1] + 5, "#ff0000", Math.random()*size + 1);
  if (b.jet.top) line(ctx, pScreen[0] - 5, pScreen[1] - 5, pScreen[0] + 5, pScreen[1] - 5, "#ff0000", Math.random()*size + 1);
  if (b.jet.bottom) line(ctx, pScreen[0] - 5, pScreen[1] + 5, pScreen[0] + 5, pScreen[1] + 5, "#ff0000", Math.random()*size + 1);
}

function renderModel(context, future) {
  let model = context.model;
  let ctx = context.ctx;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#00ff00";

  if (!future) model.forEach(b => renderTrail(ctx, b));
  model.forEach(b => renderBody(ctx, b));
}

function renderFuture(context) {
  if (calcFutureForIdx != null) {
    let ctx = context.ctx;
    let model = context.model;

    let futureModel = clone(model);
    futureModel[calcFutureForIdx].static = false;

    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 100; i++) {
      let dt = 360000;
      progressModel(futureModel, dt);
      renderModel({
        model: futureModel.filter((b, idx) => idx == calcFutureForIdx),
        ctx
      }, true);
    }
  }
}

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

function gravityF(p1, m1, p2, m2) {
  let rSq = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
  let r = Math.sqrt(rSq);
  let cos = (p2[0] - p1[0]) / r;
  let sin = (p2[1] - p1[1]) / r;

  let f = physics.G * m1 * m2 / rSq;
  return [f*cos, f*sin];
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

      let fV = gravityF(b1.p, b1.m, b2.p, b2.m);

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
  state.model = [];

  let sun = new Body([0, 0], physics.sun.m, [0, -physics.earth.orbit.velocity/2], "#ffff00");
  sun.static = true;
  state.model.push(sun);

  ["mercury", "venus", "earth", "mars"].forEach(planet => {
    state.model.push(new Body([physics[planet].orbit.size, 0], physics[planet].m, [0, physics[planet].orbit.velocity], "#0000ff"));
  });
}

function Body(p, m, v, color) {
  this.p = p;
  this.m = m;
  this.v = v;
  this.color = color;
  this.f = [0, 0];
  this.autopilot = {
    on: false
  };

  this.jet = {
    left: false,
    right: false,
    top: false,
    bottom: false
  };
  this.static = false;
  this.trail = [];
}

Body.prototype.applyForce = function(fx, fy) {
  if (fx !== null) {
    this.f[0] = fx;
    this.jet.left = this.jet.right = false;
    if (Math.abs(fx) > 1e-6) {
      this.jet.left = fx > 0;
      this.jet.right = fx < 0;
    }
  }
  if (fy !== null) {
    this.f[1] = fy;
    this.jet.top = this.jet.bottom = false;
    if (Math.abs(fy) > 1e-6) {
      this.jet.top = fy < 0;
      this.jet.bottom = fy > 0;
    }
  }
};

let newBody = null;
let mouseMoveCallbackIdx = null;
const unitForce = 2e22;

Keys.key("ArrowLeft", "Accelerate LEFT selected body", () => {
  if (state.ship == null) return;
  state.ship.applyForce(-unitForce, null);
  /*state.ship.f[0] = -unitForce;
  state.ship.jet.right = true;*/
}, () => {
  if (state.ship == null) return;
  state.ship.applyForce(0, null);
  /*state.ship.f[0] = 0;
  state.ship.jet.left = state.ship.jet.right = false;*/
});

Keys.key("ArrowRight", "Accelerate RIGHT selected body", () => {
  if (state.ship == null) return;
  state.ship.applyForce(unitForce, null);
  /*state.ship.f[0] = unitForce;
  state.ship.jet.left = true;*/
}, () => {
  if (state.ship == null) return;
  state.ship.applyForce(0, null);
  /*state.ship.f[0] = 0;
  state.ship.jet.left = state.ship.jet.right = false;*/
});

Keys.key("ArrowUp", "Accelerate UP selected body", () => {
  if (state.ship == null) return;
  state.ship.applyForce(null, unitForce);
  /*state.ship.f[1] = unitForce;
  state.ship.jet.bottom = true;*/
}, () => {
  if (state.ship == null) return;
  state.ship.applyForce(null, 0);
  /*state.ship.f[1] = 0;
  state.ship.jet.top = state.ship.jet.bottom = false;*/
});

Keys.key("ArrowDown", "Accelerate DOWN selected body", () => {
  if (state.ship == null) return;
  state.ship.applyForce(null, -unitForce);
  /*state.ship.f[1] = -unitForce;
  state.ship.jet.top = true;*/
}, () => {
  if (state.ship == null) return;
  state.ship.applyForce(null, 0);
  /*state.ship.f[1] = 0;
  state.ship.jet.top = state.ship.jet.bottom = false;*/
});

Keys.key("Delete", "Delete selected body", () => {
  if (state.ship !== null) {
    state.model = state.model.filter(b => b !== state.ship);
    state.ship = null;
  }
});

Keys.key("KeyG", "Turn ON/OFF gravity field", () => state.showField = !state.showField);
Keys.key("Space", "Pause ON/OFF", () => state.paused = !state.paused);

Keys.mouse(0, "Select a body", () => {
  let selected = state.model.filter(b => b.selected);
  if (selected.length > 0) {
    selectShip(selected[0]);
  }
});

Keys.mouse(2, "Create a new body", (e) => {
  let screenP = [e.clientX, e.clientY];
  newBody = new Body(toWorldCoords(screenP), physics.earth.m * Math.pow(10, state.createEarthMass), [0, 0], "#ff00ff");

  newBody.screenP = newBody.client = screenP;
  newBody.static = true;
  calcFutureForIdx = state.model.push(newBody) - 1;

  mouseMoveCallbackIdx = renderPipeline.push((context) => {
      if (newBody == null) return;

      line(context.ctx, newBody.screenP[0], newBody.screenP[1], newBody.client[0], newBody.client[1], "#000000");
    }) - 1;
}, () => {
  if (newBody == null) return;

  newBody.static = state.createStatic;
  delete newBody.client;
  delete newBody.screenP;
  newBody = null;
  renderPipeline.splice(mouseMoveCallbackIdx, 1);
  calcFutureForIdx = null;
});

Keys.mouseMove("With left button pressed drag to select the speed of the new body", (e) => {
  if (newBody == null) {
    state.model.forEach(b => {
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
});

Keys.mouseZoom("Zoom IN/OUT", (e) => {
  var zoomIn = e.detail ? e.detail < 0 : e.deltaY < 0;
  state.scale = Math.max(0, state.scale * (zoomIn ? 1.1 : 1 / 1.1));
  StateUi.updateUi();
});

Keys.key("F1", "Show this help message (F1 again to hide)", () => {
  let el = document.getElementById("help");

  if (el.style.display == "block") {
    el.style.display = "none";
    return;
  }

  let help = Keys.help();
  el.innerHTML =
    "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
    "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

  el.style.display = "block";
});

Keys.key("Escape", "Recreate the Universe from defaults", () => {
  Object.keys(defaultState).forEach(k => state[k] = defaultState[k]);
  initModel();
  StateUi(state);
});

Keys.key("KeyA", "Turn ON/OFF auto-pilot", () => {
  if (state.ship === null) return;

  let ship = state.ship;

  ship.autopilot.on = !ship.autopilot.on;
  if (ship.autopilot) {
    ship.autopilot.p = ship.p.slice();
  } else {
    ship.applyForce(0, 0);
  }
});

setInterval(autopilot, 100);

function autopilot() {
  state.model.filter(b => b.autopilot.on).forEach(ship => {
    let diff = Vector.subtract(ship.autopilot.p, ship.p);
    let dir = Vector.normalize(Vector.add(Vector.normalize(diff), Vector.normalize(Vector.negate(ship.v))));
    let f = Vector.mulByScalar(dir, unitForce);

    // console.debug(Vector.length(diff), diff, f);

    if (Vector.length(diff) < 1e10) ship.applyForce(0, 0);
    else ship.applyForce(f[0], f[1]);
  });

  /*if (Math.abs(f[0]) > 1e3) {
    state.ship.applyForce(f[0], null);
  } else {
    state.ship.applyForce(0, null);
  }

  if (Math.abs(f[1]) > 1e3) {
    state.ship.applyForce(null, f[1]);
  } else {
    state.ship.applyForce(null, 0);
  }*/
}