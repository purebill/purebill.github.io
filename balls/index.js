import {Ball} from "./ball.js";
import Keys from "./keys.js";
import { Tree } from "./tree.js";
import V from "./vector.js";
import Metrics from "./metrics.js";
import { collider, collider2, touching, collider3, touchingAndCluster } from "./collider.js";
import { Random } from "./random.js";

/**@type {HTMLCanvasElement} */
let canvas = document.getElementById("result");
/**@type {HTMLCanvasElement} */
let canvas2 = document.getElementById("interface");

/**@type { ((balls: Ball[], Tree, w: number, h: number, t: number) => void)[] } */
const colliders = [collider, collider2];

/**@type {Tree} */
let tree = null;
let showInfo = false;
let showMetrics = false;
let colliderIdx = 1;
let paused = false;
let drawLoopId = null;
let updateModelLoopId = null;
let metricsIntervalId = null;
let modelT0 = null;
let updateModelInteralMs = 0;
let maxDt = 0.01;
const O = [0, 0];

/**@type {Ball[]} */
let balls = [];

const modelUpdateTimer = Metrics.timer("model_update_ms");
const frameRenderTimer = Metrics.timer("frame_render_ms");
const maxVelocity = Metrics.max("velocity_max");

const collideDt = 0;
let collideT = 0;
let globalTime = 0;
function updateModel(dt) {
  const w = canvas.width;
  const h = canvas.height;

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.f = O;
  }

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const newp = V.add(b.p, V.mulByScalar(b.v, dt));
    
    tree.remove(b.p, b.r, b);
    tree.insert(newp, b.r, b);

    b.p = newp;
  }

  collideT += dt;
  if (collideT >= collideDt) {
    collideT = 0;
    colliders[colliderIdx](balls, tree, w, h, globalTime);
  }

  // gravity();
  friction();

  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.v = V.add(b.v, V.mulByScalar(b.f, dt/b.m));
    maxVelocity.update(b.v[0]);
    maxVelocity.update(b.v[1]);
  }

  // correctDt();
}

let dtCorrected = false;
function correctDt() {
  if (dtCorrected) return;

  if (maxVelocity.value() > 1000) {
    dtCorrected = true;
    paused = true;
    return;
    console.log("maxDt corrected");
    maxVelocity.reset();
    const lastMaxDt = maxDt;
    maxDt /= 100;
    dtCorrected = true;
    setTimeout(() => {
      console.log("maxDt restored");
      // dtCorrected = false;
      maxDt = lastMaxDt;
    }, 3000);
  }
}

function gravity() {
  const g = 9.8;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.f = V.add(b.f, [0, -b.m * g]);
  }
}

function friction() {
  let ff = 100;
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    // b.f = V.add(b.f, V.mulByScalar(V.normalize(V.negate(b.v)), ff));
    let f = ff;
    if (V.length(b.v) < 100) f *= 2;
    // b.f = V.add(b.f, V.mulByScalar(V.negate(b.v), f));
    b.f = V.add(b.f, V.mulByScalar(V.normalize(V.negate(b.v)), f));
  }
}

function showVector(ctx, vec, p, r) {
  const l = V.length(vec);
  if (l > 1e-6) {
    const h = ctx.canvas.height;

    const x = p[0];
    const y = h - p[1];

    const ll = Math.max(2*r, Math.min(300, l));
    const v = V.add(V.mulByScalar(V.normalize(vec), ll), p);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(v[0], h - v[1]);
    ctx.stroke();

    const textp = V.add(V.mulByScalar(V.normalize(vec), ll), p);
    ctx.fillText(Math.round(l).toString(), textp[0], h - textp[1]);
  }
}

function draw() {
  const ctx = canvas.getContext("2d");
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const colors = ["red", "green", "blue", "cyan", "magenta", "yellow", "black"];

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "black";
  for (let i = 0; i < balls.length; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = colors[i % colors.length];

    const b = balls[i];

    let x = b.p[0];
    let y = h - b.p[1];

    if (showInfo) {
      showVector(ctx, b.v, b.p, b.r);
      // showVector(ctx, b.f, b.p, b.r);
    }

    ctx.beginPath();
    ctx.ellipse(x, y, b.r, b.r, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.ellipse(x, y, b.r, b.r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

Keys.init(canvas2);

Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
  let help = Keys.help();

  const snapshot = Keys.snapshot();
  Keys.resetToRoot();
  const close = () => {
    el.style.display = "none";
    Keys.restoreFromSnapshot(snapshot);
  }
  Keys.key("F1", [], "Hide Help", close);
  Keys.key("Escape", [], "Hide Help", close);

  let el = document.getElementById("message");

  if (el.style.display == "block") {
    el.style.display = "none";
    return;
  }

  el.innerHTML =
    "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
    "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

  el.style.display = "block";
});
Keys.push(); // root contains only 'Help' functionality

Keys.key("KeyP", [], "Pause/Unpause", () => {
  paused = !paused;
  if (!paused) {
    updateModelLoop();
    drawLoop();
  };
});
Keys.key("Space", [], "Slow down", () => {
  maxDt *= 0.1;return;
});
Keys.key("Space", ["Shift"], "Speed up", () => {
  maxDt *= 10;
});
Keys.key("KeyI", [], "Show/Hide info", () => showInfo = !showInfo);
Keys.key("KeyC", [], "Iteracte colliders", () => colliderIdx = (colliderIdx + 1) % colliders.length);
Keys.key("KeyM", [], "On/Off metrics", () => showMetrics = !showMetrics);

let movingb = null;
Keys.mouse(0, [], "Start action",
  // mouse up
  e => {
    if (movingb) {
      let x = e.offsetX;
      let y = canvas2.height - e.offsetY;

      movingb.v = V.add(movingb.v, V.mulByScalar(V.subtract(movingb.p, [x, y]), 3));

      movingb = null;

      canvas2.getContext("2d").clearRect(0, 0, canvas2.width, canvas2.height);
    }
  },
  // mouse down
  e => {
    let x = e.offsetX;
    let y = canvas2.height - e.offsetY;

    movingb = null;
    for (let b of tree.find([x, y], 5)) {
      if (V.dist([x, y], b.p) <= b.r) {
        movingb = b;
        break;
      }
    }
  }
);
Keys.key("Escape", [], "Cancel", () => {
  movingb = null;
  canvas2.getContext("2d").clearRect(0, 0, canvas2.width, canvas2.height);
});
Keys.mouseMove([], "Select", e => {
  let x = e.offsetX;
  let y = canvas2.height - e.offsetY;

  if (movingb) {
    let ctx = canvas2.getContext("2d");
    ctx.save();
    ctx.strokeStyle = "black";
    ctx.clearRect(0, 0, canvas2.width, canvas2.height);

    const v = movingb.v;
    movingb.v = V.mulByScalar(V.subtract(movingb.p, [x, y]), 3);
    touchingAndCluster(tree, movingb)[1].forEach(b => {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.ellipse(b.p[0], canvas2.height - b.p[1], b.r - 1, b.r - 1, 0, 0, Math.PI*2);
      ctx.fill();
    });
    movingb.v = v;

    ctx.beginPath();
    ctx.moveTo(movingb.p[0], ctx.canvas.height - movingb.p[1]);
    ctx.lineTo(x, ctx.canvas.height - y);
    ctx.stroke();

    ctx.restore();
    return;
  }

  return;

  const found = tree.find([x, y], 5);

  let ctx = canvas2.getContext("2d");
  ctx.save();
  ctx.clearRect(0, 0, canvas2.width, canvas2.height);

  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(e.offsetX, e.offsetY, 5, 5, 0, 0, Math.PI*2);
  ctx.fill();

  let i = 0;
  found.forEach(b => {
    i++;

    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";
    b.treeCells.forEach(([_1, _2, [x1, y1, x2, y2]]) => {
      ctx.beginPath();
      ctx.rect(x1, canvas2.height - y2, x2 - x1, y2 - y1);
      ctx.stroke();

      ctx.fillStyle = "green";
      ctx.fillText(i.toString(), x1, canvas2.height - y1);
    });

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(b.p[0], canvas2.height - b.p[1], b.r - 1, b.r - 1, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "black";
    // ctx.fillText(i.toString(), b.p[0] - 5, canvas2.height - b.p[1] - 5);
    const cells = b.treeCells.map(([i, j]) => "(" + i + ", " + j + ")").join(", ");
    ctx.fillText(cells, b.p[0] - 5, canvas2.height - b.p[1] - 5);
  });

  ctx.restore();
});

const ticks = Metrics.counter("model_ticks");

function updateModelLoop() {
  if (paused) {
    modelT0 = null;
    return;
  }

  const t = new Date().getTime();

  if (modelT0 == null) modelT0 = new Date().getTime();
  let dt = (t - modelT0) / 1000;
  let iter = 1;
  if (dt > maxDt) {
    // iter = Math.ceil(dt/maxDt);
    dt = maxDt;
  }

  for (let i = 0; i < iter; i++) {
    modelUpdateTimer.measure(() => updateModel(dt));
    ticks.increment();
    globalTime += dt;
  }

  modelT0 = t;

  updateModelLoopId = setTimeout(updateModelLoop, updateModelInteralMs);
}

function drawLoop() {
  if (paused) {
    return;
  }

  frameRenderTimer.measure(draw);

  drawLoopId = requestAnimationFrame(drawLoop);
}

function initModel() {
  const random = new Random(123);

  balls = [];
  tree = new Tree(50, canvas.width, canvas.height);

  // const c = [canvas.width/2, canvas.height/2];
  // const m = 10000;
  // const r = 5*Math.pow(m, 1/3);
  // balls.push(new Ball(r, m, c, [0, 0]));
  // let N = 13;
  // const alpha = Math.PI*2/N;
  // const dist = 300;
  // for (let i = 0; i < N; i++) {
  //   const p = [canvas.width/2 + Math.cos(alpha * i) * dist, canvas.height/2 + Math.sin(alpha * i) * dist];
  //   const v = V.mulByScalar(V.normalize(V.subtract(c, p)), 100);
  //   const m = 10 + 10*i;
  //   const r = 5*Math.pow(m, 1/3);
  //   balls.push(new Ball(r, m, p, v));
  // }

  // let N = 20;
  // let space = 25;
  // for (let i = 0; i < N; i++) {
  //   const m = 1 + i*.1;
  //   const r = Math.pow(m*1000, 1/3);
  //   balls.push(new Ball(r, m, [100 + i*space, 200], [0, 0]));
  // }
  // const m = N;
  // const r = Math.pow(m*1000, 1/3);
  // balls.push(new Ball(r, m, [(N+1) * space + 100, 200], [-300, 0]));

const r = 20;
const d = 2*r;
const m = 4;
const v = [200, 0];
for (let i = 2, x = 400; i > 0; i--, x += Math.sqrt(3)*r) {
  for (let j = 0, y = canvas.height/2 + 100 - i*r; j < i; j++, y += d) {
    const p = [x, y];
    balls.push(new Ball(r, m, p, O));
  }
}
balls.push(new Ball(r, m, [800, canvas.height/2 + 100 - r], [-300, 0]));

for (let i = 2, x = 400; i > 0; i--, x += Math.sqrt(3)*r) {
  for (let j = 0, y = canvas.height/2 - 100 - i*r; j < i; j++, y += d) {
    const p = [x, y];
    balls.push(new Ball(r - .5, m, p, O));
  }
}
balls.push(new Ball(r - .5, m, [800, canvas.height/2 - 100 - r], [-300, 0]));


  // let N = 11;
  // for (let i = 0; i < N;) {
  //   const r = 20;//random.nextFloat(4, 40);
  //   const m = 4;//r*r*r/1000/32;
  //   const p = [random.nextFloat(r + 5, canvas.width - r - 5), random.nextFloat(r + 5, canvas.height - r - 5)];
  //   const v = V.random(50, random);
  //   let b = new Ball(r, m, p, v);

  //   const otherp = tree.find(p, r);
  //   let free = true;
  //   otherp.forEach(other => free = free && !touching(other, b));
  //   if (!free) continue;

  //   balls.push(b);
  //   tree.insert(b.p, b.r, b);

  //   i++;
  // }


  balls.forEach(b => tree.insert(b.p, b.r, b));
}

function init() {
  cancelAnimationFrame(updateModelLoopId);
  clearInterval(drawLoopId);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas2.width = canvas.width;
  canvas2.height = canvas.height;

  initModel();

  updateModelLoop();
  drawLoop();

  if (paused) draw();

  // setInterval(() => {
  //   const pe = balls.map(b => Math.pow(V.length(b.v), 2) * b.m / 2).reduce((accum, v) => accum + v);
  //   console.log(Math.round(pe));
  // }, 300);

  clearInterval(metricsIntervalId);
  metricsIntervalId = setInterval(() => {
    if (showMetrics) {
      let ctx = canvas2.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = "black";
      let x = 20, y = 20;
      Metrics.all().forEach((value, name) => {
        ctx.fillText(name + ": " + value, x, y);
        y += 20;
      });
      
      ctx.restore();
    }
  }, 1000);
}

// window.onresize = init;
init();

// experiment();

function experiment() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let N = 510;
  colliderIdx = 0;
  let balls1, balls2, tree1, tree2;
  initModel();
  balls1 = balls;
  tree1 = tree;
  initModel();
  balls2 = balls;
  tree2 = tree;

  for (let i = 0; i < N; i++) {
    colliderIdx = 0;
    balls = balls1;
    tree = tree1;
    updateModel(0.01);

    colliderIdx = 1;
    balls = balls2;
    tree = tree2;
    updateModel(0.01);

    console.log("[1]", i);
    if (!eq(balls1, balls2)) break;
  }

  function eq(balls1, balls2) {
    for (let i = 0; i < balls1.length; i++) {
      let b1 = balls1[i];
      let b2 = balls2[i];
      if (Math.abs(b1.p[0] - b2.p[0]) > 1 || Math.abs(b1.p[1] - b2.p[1]) > 1) {
        console.error("Not equual", i, V.subtract(balls1[i].p, balls2[i].p));
        setInterval(() => {
          balls = balls === balls1 ? balls2 : balls1;
          draw();
        }, 1000);    
        return false;
      }
    }
    console.log("Equal");
    return true;
  }
}