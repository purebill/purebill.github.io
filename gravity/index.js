const physics = {
  G: 6.67e-11,
  width: 1e12, // m
  height: 1e12, // m
  sun: {
    m: 2e30, // kg
    r: 695510000 // m
  },
  earth: {
    m: 6e24, // kg
    r: 6371000, // m
    orbit: {
      size: 150e9, // m
      velocity: 30000 // m/s
    }
  },
  mars: {
    m: 6.4e24, // kg
    r: 3389500, // m
    orbit: {
      size: 228e9, // m
      velocity: 24000 // m/s
    }
  },
  mercury: {
    m: 3.3e23, // kg
    r: 2439700,
    orbit: {
      size: 58e9, // m
      velocity: 47000 // m/s
    }
  },
  venus: {
    m: 4.87e24,
    r: 6051800,
    orbit: {
      size: 108e9,
      velocity: 35000
    }
  }
};

let state = {
  scale: 1,
  shiftX: 0,
  shiftY: 0,
  timeScale: 1,
  paused: false,
  createEarthMass: 1,
  createStatic: false,
  modelSecondsPerRealSecond: 3600 * 24 * 10,
  modelStepSeconds: 3600 * 20,
  showField: false,
  model: [],
  ship: null,
  autopilot: {},
  particles: {
    N: 200
  }
};
let defaultState = clone(state);

let calcFutureForIdx = null;

let canvas = document.createElement("canvas");
let visibleCanvas = document.createElement("canvas");
let aspect;
function onResize() {
  visibleCanvas.width = window.innerWidth - 50;
  visibleCanvas.height = window.innerHeight - 50;
  visibleCanvas.style.width = visibleCanvas.width + "px";
  visibleCanvas.style.height = visibleCanvas.height + "px";
  visibleCanvas.style.display = "";
  visibleCanvas.style.position = "fixed";
  visibleCanvas.style.left = 0;
  visibleCanvas.style.top = 0;

  aspect = visibleCanvas.height / visibleCanvas.width;

  canvas.width = visibleCanvas.width;
  canvas.height = visibleCanvas.height;
}
window.onresize = onResize;
onResize();
document.body.appendChild(visibleCanvas);

let start, last;
function loop(ts) {
  if (!start) {
    start = ts;
    last = ts;
  }

  renderFrame(ts, ts - last);
  last = ts;

  let ctx = visibleCanvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas, 0, 0);

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
Keys.init(visibleCanvas);
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

  let r = b.r ? Math.max(sizeToCanvas(b.r), 5) : 5;
  ctx.beginPath();
  ctx.arc(pScreen[0], pScreen[1], r, 0, Math.PI*2);
  ctx.fill();
  /*if (b.static) ctx.strokeRect(pScreen[0] - r, pScreen[1] - r, 2*r, 2*r);
  else ctx.fillRect(pScreen[0] - r, pScreen[1] - r, 2*r, 2*r);*/

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
      let dt = 360000 / state.scale;
      progressModel(futureModel, dt, true);
      renderModel({
        model: futureModel.filter((b, idx) => idx == calcFutureForIdx),
        ctx
      }, true);
    }
  }
}

function toCanvasCoords(p, result) {
  let x = aspect * state.scale * canvas.width / physics.width * p[0] + canvas.width / 2;
  let y = canvas.height / 2 - state.scale * canvas.height / physics.height * p[1];

  if (result) {
    result[0] = x + state.shiftX;
    result[1] = y + state.shiftY;
  } else result = [x + state.shiftX, y + state.shiftY];

  return result;
}

function sizeToCanvas(worldSize) {
  let origin = toCanvasCoords([0, 0]);
  let p = toCanvasCoords([worldSize, 0]);
  return V.length(V.subtract(p, origin));
}

function sizeToWorld(canvasSize) {
  let origin = toWorldCoords([0, 0]);
  let p = toWorldCoords([canvasSize, 0]);
  return V.length(V.subtract(p, origin));
}

function toWorldCoords(p, result) {
  let x = ((p[0] - state.shiftX) - canvas.width / 2)/aspect/state.scale/canvas.width*physics.width;
  let y = (canvas.height / 2 - (p[1] - state.shiftY))/state.scale/canvas.height*physics.height;
  if (result) {
    result[0] = x;
    result[1] = y;
  } else result = [x, y];
  return result;
}

function rgba(rgb, alpha) {
  return "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", " + alpha + ")";
}

function parseColor(str) {
  let a = str.match(/#(..)(..)(..)/);
  if (a) return a.slice(1).map(hex => parseInt(hex, 16));
  a = str.match("rgba\(([^,]+)\s*,\s*([^,]+)\s*,\s*\([^,]+)\s*,\s*([^,]+)\s*)");
  return a.slice(1).map(v => parseInt(v));
}

function gravityF(p1, m1, p2, m2, result) {
  let rSq = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
  let r = Math.sqrt(rSq);
  let cos = (p2[0] - p1[0]) / r;
  let sin = (p2[1] - p1[1]) / r;

  let f = physics.G * m1 * m2 / rSq;
  if (result) {
    result[0] = f*cos;
    result[1] = f*sin;
  } else result = [f*cos, f*sin];

  return result;
}

function newPosition(b, dt) {
  if (b.static) return b.p;

  return [b.p[0] + b.v[0] * dt, b.p[1] + b.v[1] * dt];
}

function isCollapsing(b1, b2, dt) {
  let v1 = V.subtract(b2.p, b1.p);
  let d = V.length(v1);

  if (d <= b1.r + b2.r) return true;

  let criticalAlpha = Math.abs(Math.atan((b1.r + b2.r) / d));

  let p1Next = newPosition(b1, dt);
  let v2 = V.subtract(p1Next, b1.p);
  let alpha = Math.abs(Math.acos(V.dotProduct(v1, v2) / d / V.length(v2)));

  if (alpha <= criticalAlpha) {
    let v1n = V.normal(v1);
    let a = v1n[1] / v1n[0];
    let b = -a*b2.p[0] + b2.p[1];

    if (Math.sign(a*b1.p[0] + b - b1.p[1]) != Math.sign(a*p1Next[0] + b - p1Next[1])) return true;
  }

  return false;
}

function checkCollisions(model, dt) {
  let collapse = {};
  let collapsed = false;
  for (let i = 0; i < model.length; i++) {
    let b1 = model[i];
    if (b1.particle) continue;

    for (let j = i + 1; j < model.length; j++) {
      let b2 = model[j];
      if (b2.particle) continue;

      if (!b1.collapsed && !b2.collapsed
        && (isCollapsing(b1, b2, dt) || isCollapsing(b2, b1, dt))) {
        collapsed = true;
        if (!(i in collapse)) collapse[i] = [];
        collapse[i].push(j);
      }
    }
  }

  if (collapsed) {
    let toRemove = [];
    for (let i in collapse) {
      let b1 = model[i];
      b1.collapsed = true;
      collapse[i].forEach(j => {
        let b2 = model[j];

        let removing = b1.static ? b2 : (b1.m > b2.m ? b2 : b1);
        if (toRemove.indexOf(removing) === -1) toRemove.push(removing);
        b1 === removing ? b2.collapsed = false : b1.collapsed = false;

        for (let k = 0; k < state.particles.N; k++) {
          let particle = Body.builder()
            .m(0)
            .particle(true)
            .p(V.mulByScalar(V.add(b1.p, b2.p), 0.5))
            .v(V.random(physics.earth.orbit.velocity * (Math.random() + 1) * 2))
            .color("#ff0000")
            .build();

          let c = parseColor(particle.color).slice(0, 3);
          animateOnTimer([1], [0], 100, 1000, (v) => particle.color = rgba(c, v), () => {
            let idx = model.indexOf(particle);
            if (idx >= 0) model.splice(idx, 1);
          });

          model.push(particle);
        }
      });
    }

    toRemove.forEach(b => model.splice(model.indexOf(b), 1));
  }
}
function progressModel(model, dt, future) {
  // Jet and other non-gravity forces
  model.forEach(b => b.a = V.mulByScalar(b.f, 1/b.m));

  // Calculate gravity
  for (let i = 0; i < model.length; i++) {
    let b1 = model[i];
    if (b1.particle) continue;

    for (let j = i+1; j < model.length; j++) {
      let b2 = model[j];
      if (b2.particle) continue;

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

  if (!future) checkCollisions(model, dt);

  // Calculate new position based on the current velocity
  model.forEach(b => b.p = newPosition(b, dt));
}

function initModel() {
  state.model = [];

  let sun = Body.builder()
    .p([0, 0])
    .m(physics.sun.m)
    .r(physics.sun.r)
    .v([0, 0])
    .color("#ffff00")
    .static(true)
    .build();
  state.model.push(sun);

  ["mercury", "venus", "earth", "mars"].forEach(name => {
    let planet = physics[name];

    state.model.push(Body.builder()
      .p([planet.orbit.size, 0])
      .m(planet.m)
      .v([0, planet.orbit.velocity])
      .color("#0000ff")
      .build());
  });
}

//setInterval(autopilot, 100);

function autopilot() {
  state.model.filter(b => b.autopilot.on).forEach(ship => {
    let diff = V.subtract(ship.autopilot.p, ship.p);
    let dir = V.normalize(V.add(V.normalize(diff), V.normalize(V.negate(ship.v))));
    let f = V.mulByScalar(dir, unitForcePerKg);

    // console.debug(V.length(diff), diff, f);

    if (V.length(diff) < 1e10) ship.applyForce(0, 0);
    else ship.applyForce(f[0], f[1]);
  });
}