const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

window.onresize = () => {
  canvas.width = window.innerWidth - 20;
  canvas.height = window.innerHeight - 20;
};
window.onresize();

/** @type {Plane} */
let plane;
let paused = true;
let flies = [];
let fliesToAddAfterTick = [];
let lastT;
let timeScale;
let missileProbability;
let missilePeriod;
let missileMaxCount;
let lastMissileCheckTime;
let starProbability;
let starPeriod;
let starMaxCount;
let lastStarAddTime;
let score;
let booster;
let boosterIsUsed;
let level;
let globalTime;
let rotationDirection;

let fps = 0;

function frame(t) {
  if (paused) return;

  if (lastT === null) lastT = t;
  let dt = t - lastT;

  if (dt > 0) fps = (fps + 1000 / dt) / 2;

  dt /= timeScale;
  lastT = t;

  globalTime += dt;

  updateBooster(dt);
  updateDifficulty(dt);
  fireMissiles(dt);
  addStars(dt);
  progress(dt);
  detectCollision();
  removeDead();
  addNewFlies();
  draw(ctx);

  requestAnimationFrame(frame);
}

function updateBooster(dt) {
  if (boosterIsUsed) {
    booster -= dt;
    if (booster <= 0) {
      booster = 0;
      boosterIsUsed = false;
      plane.maxVelocity = 100/1000;
    }
  }
}

function fireMissiles(dt) {
  if (lastMissileCheckTime > missilePeriod) {
    lastMissileCheckTime = 0;
    if (Math.random() < missileProbability) {
      if (flies.filter(o => o instanceof Missile).length < missileMaxCount) {
        if (Math.random() > 0.5) {
          missile(Math.random() * ctx.canvas.width, Math.random() > 0.5 ? 0 : ctx.canvas.height);
        } else {
          missile(Math.random() > 0.5 ? 0 : ctx.canvas.width, Math.random() * ctx.canvas.height);
        }
      }
    }
  }
  lastMissileCheckTime += dt;
}

function addStars(dt) {
  if (lastStarAddTime > starPeriod) {
    lastStarAddTime = 0;
    if (Math.random() < starProbability) {
      if (flies.filter(o => o instanceof Star).length < starMaxCount) {
        const minL = 50;
        const maxL = 300;
        const starV = V.add(plane.xy, V.random(minL + Math.random() * (maxL - minL)));
        star(starV[0], starV[1]);
      }
    }
  }

  lastStarAddTime += dt;
}

function progress(dt) {
  flies.forEach(fly => {
    fly.progress(dt);

    let x = fly.xy[0];
    if (x < 0) x += ctx.canvas.width;
    if (x >= ctx.canvas.width) x -= ctx.canvas.width;

    let y = fly.xy[1];
    if (y < 0) y += ctx.canvas.height;
    if (y >= ctx.canvas.height) y -= ctx.canvas.height;
    fly.xy[0] = x;
    fly.xy[1] = y;
  });
}

function detectCollision() {
  for (let i = 0; i < flies.length; i++) {
    for (let j = i + 1; j < flies.length; j++) {
      const first = flies[i];
      const second = flies[j];
      if (first.colideWith(second) && second.colideWith(first)) {
        if (first instanceof Star || second instanceof Star) {
          if (first === plane || second === plane) {
            score++;
            booster += 2000;
            (first === plane ? second : first).dead = true;
          }
          continue;
        }

        explosionFor(first);
        explosionFor(second);
      }
    }
  }
}

function removeDead() {
  const toRemove = [];
  flies.forEach(o => { if (o.dead) toRemove.push(o); });
  if (toRemove.length > 0) {
    let gameOver = false;
    toRemove.forEach(o => {
      if (o === plane) gameOver = true;
      flies.splice(flies.indexOf(o), 1);
    });
    if (gameOver) setTimeout(reset, 3000);
  }
}

function explosionFor(o) {
  o.dead = true;
  fliesToAddAfterTick.push(new Explosion(o.xy));
}

function addNewFlies() {
  if (fliesToAddAfterTick.length > 0) {
    fliesToAddAfterTick.forEach(o => flies.push(o));
    fliesToAddAfterTick = [];
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function draw(ctx) {
  ctx.save();

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  flies.forEach(fly => {
    ctx.save();
    fly.draw(ctx);
    ctx.restore();
  });

  const fontSize = 12;
  const lineHeight = fontSize * 1.1;
  ctx.fillStyle = "black";
  ctx.font = fontSize + "px sefif";
  let line = 1;
  ctx.fillText("FPS: " + Math.round(fps), 0, line++ * lineHeight);
  ctx.fillText("Time: " + (Math.round(globalTime / 1000)), 0, line++ * lineHeight);
  ctx.fillText("Score: " + score, 0, line++ * lineHeight);
  if (booster > 0) {
    ctx.fillText("Booster: " + Math.round(booster / 1000) + " sec", 0, line++ * lineHeight);
  }

  ctx.restore();
}

function reset() {
  canvas.focus();

  flies = [];
  fliesToAddAfterTick = [];
  plane = new Plane([ctx.canvas.width / 2, ctx.canvas.height / 2]);
  flies.push(plane);

  lastT = null;
  timeScale = 1;
  missileProbability = 0.5;
  missilePeriod = 1000;
  missileMaxCount = 1;
  lastMissileCheckTime = 0;
  starProbability = 0.8;
  starPeriod = 1000;
  starMaxCount = 1;
  lastStarAddTime = 0;
  score = 0;
  booster = 10000;
  boosterIsUsed = false;
  level = 1;
  globalTime = 0;
  rotationDirection = null;
}

function missile(x, y) {
  fliesToAddAfterTick.push(new Missile([x, y], plane));
}

function star(x, y) {
  fliesToAddAfterTick.push(new Star([x, y]));
}

function pause() {
  paused = true;
}

function resume() {
  lastT = null;
  paused = false;
  requestAnimationFrame(frame);
}

function updateDifficulty(dt) {
  switch (level) {
    case 1:
      if (score > 4 || globalTime > 2 * 60000) {
        level = 2;
        missileMaxCount = 2;
      }
      break;

    case 2:
      if (globalTime > 2 * 60000) {
        level = 3;
        missileMaxCount = 3;
        missileProbability = 1;
      }
      break;
  }
}

Keys.init(canvas);
Keys.key("ArrowRight", [], "Turn right",
  () => { rotationDirection = "right"; plane.right(); },
  () => { if (rotationDirection == "right") plane.noRotate(); });
Keys.key("ArrowLeft", [], "Turn left",
  () => { rotationDirection = "left"; plane.left() },
  () => { if (rotationDirection == "left") plane.noRotate(); });
Keys.key("ArrowDown", [], "Unboost",
  () => {
    boosterIsUsed = false;
    plane.maxVelocity = 100/1000;
    plane.stopBoost();
  });
Keys.key("ArrowUp", [], "Boost",
  () => {
    boosterIsUsed = true;
    plane.maxVelocity = (booster > 0 ? 150/1000 : 100/1000);
    plane.startBoost();
  });
Keys.key("Escape", [], "Reset", reset);
Keys.key("Space", [], "Pause/Resume", () => paused ? resume() : pause());
Keys.key("NumpadAdd", [], "Slower", () => timeScale = Math.min(timeScale * 2, 10));
Keys.key("NumpadSubtract", [], "Faster", () => timeScale = Math.max(timeScale / 2, 1));
//Keys.mouse(0, [], "Missile", e => missile(e.offsetX, e.offsetY));
Keys.mouse(0, [], "Show/Hide mouse cursor", () => canvas.style.cursor = canvas.style.cursor == "none" ? "default" : "none");
// Keys.key("KeyZ", [], "Scale down", () => flies.forEach(o => o.size /= 1.5));
// Keys.key("KeyZ", ["Shift"], "Scale up", () => flies.forEach(o => o.size *= 1.5));

reset();
resume();