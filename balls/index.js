import {Ball, collide} from "./ball.js";
import Keys from "./keys.js";
import V from "./vector.js";

/**@type {Ball[]} */
const balls = [];

const collideDt = 1/50;
let collideT = 0;
function updateModel(dt, w, h) {
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    b.p = V.add(b.p, V.mulByScalar(b.v, dt));
  }

  collideT += dt;
  if (collideT >= collideDt) {
    let updated = balls.map(b => false);
    let balls2 = balls.map(b => [0, 0]);

    for (let i = 0; i < balls.length; i++) {
      const b1 = balls[i];

      // if (b1.p[0] - b1.r <= 0 || b1.p[0] + b1.r >= w) b1.v[0] = -b1.v[0];
      // if (b1.p[1] - b1.r <= 0 || b1.p[1] + b1.r >= h) b1.v[1] = -b1.v[1];

      for (let j = i + 1; j < balls.length; j++) {
        const b2 = balls[j];
        if (V.dist(b1.p, b2.p) <= b1.r + b2.r) {
          const [newv1, newv2] = collide(b1, b2);
          balls2[i][0] += newv1[0];
          balls2[i][1] += newv1[1];
          balls2[j][0] += newv2[0];
          balls2[j][1] += newv2[1];
          updated[i] = true;
          updated[j] = true;
        }
      }

      if (b1.p[0] - b1.r <= 0 || b1.p[0] + b1.r >= w) {
        if (updated[i]) {
          balls2[i][0] = -balls2[i][0];
        } else {
          balls2[i][0] = -b1.v[0];
          balls2[i][1] = b1.v[1];
          updated[i] = true;
        }
      }
      if (b1.p[1] - b1.r <= 0 || b1.p[1] + b1.r >= h) {
        if (updated[i]) {
          balls2[i][1] = -balls2[i][1];
        } else {
          balls2[i][0] = b1.v[0];
          balls2[i][1] = -b1.v[1];
          updated[i] = true;
        }
      }
    }
    for (let i = 0; i < balls2.length; i++) {
      if (updated[i]) balls[i].v = balls2[i];
    }
    collideT = 0;
  }
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 */
function draw(ctx) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.width;
  const colors = ["red", "green", "blue", "cyan", "magenta", "yellow", "black"];

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < balls.length; i++) {
    ctx.fillStyle = colors[i % colors.length];

    const b = balls[i];

    let x = b.p[0];
    let y = h - b.p[1];

    ctx.beginPath();
    ctx.ellipse(x, y, b.r, b.r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

let canvas = document.getElementById("result");
canvas.width = 500;
canvas.height = 500;

let ctx = canvas.getContext("2d");
let t0 = null;
function loop(t) {
  if (paused) {
    t0 = null;
    return;
  }

  if (t0 == null) t0 = t;
  let dt = (t - t0) / 1000;

  updateModel(dt, canvas.width, canvas.height);
  draw(ctx);

  t0 = t;

  requestAnimationFrame(loop);
}

let paused = false;
Keys.key("Space", [], "Pause/Unpause", () => {
  paused = !paused;
  if (!paused) requestAnimationFrame(loop);
})

let b1 = new Ball(10, 1, [100, 210], [0, 0]);
let b2 = new Ball(10, 1, [100, 190], [0, 0]);
let b3 = new Ball(10, 1, [200, 200], [-100, 0]);
balls.push(b1, b2, b3);

// let N = 300;
// for (let i = 0; i < N; i++) {
//   let b = new Ball(4, 1 + Math.random()*1, [Math.random()*500, Math.random()*500], V.random(100));
//   balls.push(b);
// }
requestAnimationFrame(loop);

setInterval(() => {
  const pe = balls.map(b => Math.pow(V.length(b.v), 2) * b.m / 2).reduce((accum, v) => accum + v);
  console.log(Math.round(pe));
}, 300);