import {Ball} from "./ball.js";
import Keys from "./keys.js";
import { Tree } from "./tree.js";
import V from "./vector.js";
import Metrics from "./metrics.js";
import { collider, collider2, touching } from "./collider.js";
import { Random } from "./random.js";

/**@type {HTMLCanvasElement} */
let canvas = document.getElementById("result");
/**@type {HTMLCanvasElement} */
let canvas2 = document.getElementById("interface");

/**@type { ((balls: Ball[], Tree, w: number, h: number) => void)[] } */
const colliders = [collider, collider2, () => {}];

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

/**@type {Ball[]} */
let balls = [];

const modelUpdateTimer = Metrics.timer("model_update_ms");
const frameRenderTimer = Metrics.timer("frame_render_ms");

const collideDt = 0;
let collideT = 0;
function updateModel(dt) {
  const w = canvas.width;
  const h = canvas.height;

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
    colliders[colliderIdx](balls, tree, w, h);
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

    const b = balls[i];

    let x = b.p[0];
    let y = h - b.p[1];

    if (showInfo) {
      if (V.length(b.v) > 1e-6) {
        const v = V.add(V.mulByScalar(V.normalize(b.v), b.r*2), b.p);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(v[0], h - v[1]);
        ctx.stroke();

        const textp = V.add(V.mulByScalar(V.normalize(b.v), b.r*3), b.p);
        ctx.fillText(Math.round(V.angle(b.v, [1, 0])).toString(), textp[0], h - textp[1]);
      }
    }

    ctx.beginPath();
    ctx.ellipse(x, y, b.r, b.r, 0, 0, Math.PI * 2);
    ctx.fill();
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

Keys.key("Space", [], "Pause/Unpause", () => {
  paused = !paused;
  if (!paused) {
    updateModelLoop();
    drawLoop();
  };
});
Keys.key("KeyI", [], "Show/Hide info", () => showInfo = !showInfo);
Keys.key("KeyC", [], "Iteracte colliders", () => colliderIdx = (colliderIdx + 1) % colliders.length);
Keys.key("KeyM", [], "On/Off metrics", () => showMetrics = !showMetrics);

Keys.mouseMove([], "Select", e => {
  let x = e.offsetX;
  let y = canvas2.height - e.offsetY;

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
  const maxDt = 0.010;
  let iter = 1;
  if (dt > maxDt) {
    iter = Math.ceil(dt/maxDt);
    dt = maxDt;
  }

  for (let i = 0; i < iter; i++) {
    modelUpdateTimer.measure(() => updateModel(dt));
    ticks.increment();
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
  // balls.push(new Ball(100, 100, c, [0, 0]));
  // let N = 20;
  // const alpha = Math.PI*2/N;
  // const dist = 300;
  // for (let i = 0; i < N; i++) {
  //   const p = [canvas.width/2 + Math.cos(alpha * i) * dist, canvas.height/2 + Math.sin(alpha * i) * dist];
  //   const v = V.mulByScalar(V.normalize(V.subtract(c, p)), 100);
  //   const m = 10 + 10*i;
  //   const r = 5*Math.pow(m, 1/3);
  //   balls.push(new Ball(r, m, p, v));
  // }

  // let N = 40;
  // let space = 25;
  // for (let i = 0; i < N; i++) balls.push(new Ball(10, 1 + i*.1, [100 + i*space, 200], [0, 0]));
  // balls.push(new Ball(10, N, [(N+1) * space + 100, 200], [-300, 0]));

  let N = 100;
  for (let i = 0; i < N;) {
    const r = random.nextFloat(4, 40);
    const m = r*r*r*.001;
    const p = [random.nextFloat(r + 5, canvas.width - r - 5), random.nextFloat(r + 5, canvas.height - r - 5)];
    const v = V.random(100, random);
    let b = new Ball(r, 1 + random.nextFloat(0, 1), p, v);

    const otherp = tree.find(p, r);
    let free = true;
    otherp.forEach(other => free = free && !touching(other, b));
    if (!free) continue;

    balls.push(b);
    tree.insert(b.p, b.r, b);

    i++;
  }

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