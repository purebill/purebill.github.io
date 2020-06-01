class Game {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.reset();
  }

  reset() {
    Timer.clearAll();
    
    /** @type {Entity[]} */
    this.flies = [];
    this.plane = new Plane([this.ctx.canvas.width / 2, this.ctx.canvas.height / 2]);
    this.flies.push(this.plane);

    this.paused = true;
    this.fliesToAddAfterTick = [];
    this.lastT = null;
    this.timeScale = 1;
    this.missileProbability = 0.5;
    this.missilePeriod = 1000;
    this.missileMaxCount = 1;
    this.lastMissileCheckTime = 0;
    this.starProbability = 0.8;
    this.starPeriod = 1000;
    this.starMaxCount = 1;
    this.lastStarAddTime = 0;
    this.score = 0;
    this.lifes = 1;
    this.booster = 10000;
    this.boosterIsUsed = false;
    this.level = 1;
    this.globalTime = 0;
    this.rotationDirection = null;
    this.fps = 0;

    this.triggers = [];
    this.triggers.push(scoreTrigger(this, 5, () => this.lifes += 1));
    this.triggers.push(scoreTrigger(this, 1, () => this.booster += 2000));

    this.randomObstacles();
  }

  randomObstacles() {
    let collided = false;
    let obstacle;
    do {
      let xc = Math.random() * this.ctx.canvas.width;
      let yc = Math.random() * this.ctx.canvas.height;
      let r = 20 + Math.random() * 30;
      const N = Math.round(3 + Math.random()*10);
      const vertices = [];
      for (let i = 0; i < N; i++) {
        const x = r * Math.cos(2*Math.PI/N*i);
        const y = r * Math.sin(2*Math.PI/N*i);
        vertices.push([xc + x, yc + y]);
      }
      obstacle = new Obstacle(new ConvexPolygonRegion(vertices));
      collided = false;
      for (let fly of this.flies) {
        if (fly.colideWith(obstacle)) collided = true;
      }
    } while (collided);
    this.fliesToAddAfterTick.push(obstacle);

    Timer.set(() => this.randomObstacles(), 10000 + Math.random() * 50000);
  }

  init() {
    Keys.resetToRoot();
    Keys.push();
    Keys.key("ArrowRight", [], "Turn right",
      () => { this.rotationDirection = "right"; this.plane.right(); },
      () => { if (this.rotationDirection == "right") this.plane.noRotate(); });
    Keys.key("ArrowLeft", [], "Turn left",
      () => { this.rotationDirection = "left"; this.plane.left() },
      () => { if (this.rotationDirection == "left") this.plane.noRotate(); });
    Keys.key("ArrowDown", [], "Unboost",
      () => {
        this.boosterIsUsed = false;
        this.plane.maxVelocity = 100/1000;
        this.plane.stopBoost();
      });
    Keys.key("ArrowUp", [], "Boost",
      () => {
        this.boosterIsUsed = true;
        this.plane.maxVelocity = (this.booster > 0 ? 150/1000 : 100/1000);
        this.plane.startBoost();
      });
    Keys.key("Escape", [], "Reset", () => this.reset());
    Keys.key("Space", [], "Pause/Resume", () => this.paused ? this.resume() : this.pause());
    Keys.key("NumpadAdd", [], "Slower", () => this.timeScale = Math.min(this.timeScale * 2, 10));
    Keys.key("NumpadSubtract", [], "Faster", () => this.timeScale = Math.max(this.timeScale / 2, 1));
    Keys.mouse(0, [], "Missile", e => {
      if (this.paused) {
        this.fliesToAddAfterTick.push(new Obstacle(new CircleRegion([e.offsetX, e.offsetY], 10)));
        this.addNewFlies();
        this.draw();
      }
    });
    // Keys.key("KeyZ", [], "Scale down", () => flies.forEach(o => o.size /= 1.5));
    // Keys.key("KeyZ", ["Shift"], "Scale up", () => flies.forEach(o => o.size *= 1.5));
  }

  frame(t) {
    if (this.paused) return;

    if (this.lastT === null) this.lastT = t;
    let dt = t - this.lastT;

    Timer.progress(dt);

    if (dt > 0) this.fps = (this.fps + 1000 / dt) / 2;

    dt /= this.timeScale;
    this.lastT = t;

    this.globalTime += dt;

    this.updateBooster(dt);
    this.updateDifficulty(dt);
    this.fireMissiles(dt);
    this.addStars(dt);
    this.progress(dt);
    this.detectCollision();
    this.removeDead();
    this.addNewFlies();
    this.triggers.forEach(trigger => trigger());
    this.draw();

    requestAnimationFrame(t => this.frame(t));
  }

  updateBooster(dt) {
    if (this.boosterIsUsed) {
      this.booster -= dt;
      if (this.booster <= 0) {
        this.booster = 0;
        this.boosterIsUsed = false;
        this.plane.maxVelocity = 100/1000;
      }
    }
  }

  fireMissiles(dt) {
    if (this.lastMissileCheckTime > this.missilePeriod) {
      this.lastMissileCheckTime = 0;
      if (Math.random() < this.missileProbability) {
        if (this.flies.filter(o => o instanceof Missile).length < this.missileMaxCount) {
          this.missile();
        }
      }
    }
    this.lastMissileCheckTime += dt;
  }

  addStars(dt) {
    if (this.lastStarAddTime > this.starPeriod) {
      this.lastStarAddTime = 0;
      if (Math.random() < this.starProbability) {
        if (this.flies.filter(o => o instanceof Star).length < this.starMaxCount) {
          this.star();
        }
      }
    }

    this.lastStarAddTime += dt;
  }

  wrapAround(xy) {
    let x = xy[0];
    if (x < 0) x += this.ctx.canvas.width;
    if (x >= this.ctx.canvas.width) x -= this.ctx.canvas.width;

    let y = xy[1];
    if (y < 0) y += this.ctx.canvas.height;
    if (y >= this.ctx.canvas.height) y -= this.ctx.canvas.height;
    if (x === xy[0] && y === xy[1]) return xy;
    return [x, y];
  }

  progress(dt) {
    this.flies.forEach(enity => {
      enity.progress(dt);
      
      if (enity instanceof Fly) {
        enity.xy = this.wrapAround(enity.xy);
      }
    });
  }

  detectCollision() {
    for (let i = 0; i < this.flies.length; i++) {
      for (let j = i + 1; j < this.flies.length; j++) {
        const first = this.flies[i];
        const second = this.flies[j];
        if (first.colideWith(second)) {
          if (first instanceof Perk || second instanceof Perk) {
            if (first === this.plane || second === this.plane) {
              ((first instanceof Perk) ? first : second).collected(this);
            }
            continue;
          }

          if (first === this.plane || second === this.plane) {
            const other = first === this.plane ? second : first;
            if (other instanceof Obstacle) {
              this.lifes = 1;
            } else {
              this.explosionFor(other);
            }

            this.lifes--;
            if (this.lifes <= 0) this.explosionFor(this.plane);
            continue;
          }

          if (first instanceof Missile) this.score += 5;
          if (second instanceof Missile) this.score += 5;

          if (!(first instanceof Obstacle)) this.explosionFor(first);
          if (!(second instanceof Obstacle)) this.explosionFor(second);
        }
      }
    }
  }

  removeDead() {
    const toRemove = [];
    this.flies.forEach(o => { if (o.dead) toRemove.push(o); });
    if (toRemove.length > 0) {
      let gameOver = false;
      toRemove.forEach(o => {
        if (o === this.plane) gameOver = true;
        if (o instanceof Missile) this.score += 5;
        this.flies.splice(this.flies.indexOf(o), 1);
      });
      if (gameOver) setTimeout(() => this.reset(), 3000);
    }
  }
  
  explosionFor(o) {
    o.dead = true;
    this.fliesToAddAfterTick.push(new Explosion(o.xy));
  }

  addNewFlies() {
    if (this.fliesToAddAfterTick.length > 0) {
      this.fliesToAddAfterTick.forEach(o => this.flies.push(o));
      this.fliesToAddAfterTick = [];
    }
  }

  draw() {
    this.ctx.save();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.flies.forEach(fly => {
      this.ctx.save();
      fly.draw(this.ctx);
      this.ctx.restore();
    });

    const fontSize = 12;
    const lineHeight = fontSize * 1.1;
    this.ctx.fillStyle = "black";
    this.ctx.font = fontSize + "px sefif";
    let line = 1;
    this.ctx.fillText("FPS: " + Math.round(this.fps), 0, line++ * lineHeight);
    this.ctx.fillText("Time: " + (Math.round(this.globalTime / 1000)), 0, line++ * lineHeight);
    this.ctx.fillText("Score: " + this.score, 0, line++ * lineHeight);
    if (this.booster > 0) {
      this.ctx.fillText("Booster: " + Math.round(this.booster / 1000) + " sec", 0, line++ * lineHeight);
    }
    this.ctx.fillText("Lifes: " + this.lifes, 0, line++ * lineHeight);

    this.ctx.restore();
  }

  missile() {
    let x, y, m;

    let colides = false;
    do {
      if (Math.random() > 0.5) {
        x = Math.random() * this.ctx.canvas.width;
        y = Math.random() > 0.5 ? 0 : this.ctx.canvas.height;
      } else {
        x = Math.random() > 0.5 ? 0 : this.ctx.canvas.width;
        y = Math.random() * this.ctx.canvas.height;
      }
      m = new Missile([x, y], this.plane);

      colides = false;
      for (const f of this.flies) {
        if (f.colideWith(m)) colides = true;
      }
    } while(colides);
    this.fliesToAddAfterTick.push(m);
  }

  star() {
    let star, colides;
    do {
      const minL = 50;
      const maxL = 300;
      const starV = this.wrapAround(V.add(this.plane.xy, V.random(minL + Math.random() * (maxL - minL))));
      star = new Star(starV);
      colides = false;
      for (const f of this.flies) {
        if (f.colideWith(star)) colides = true;
      }
    } while(colides);

    this.fliesToAddAfterTick.push(star);
  }

  pause() {
    if (this.paused) return;

    this.paused = true;
  }

  resume() {
    if (!this.paused) return;

    this.lastT = null;
    this.paused = false;
    requestAnimationFrame(t => this.frame(t));
  }

  updateDifficulty(dt) {
    switch (this.level) {
      case 1:
        if (this.score > 4 || this.globalTime > 30000) {
          this.level = 2;
          this.missileMaxCount = 2;
        }
        break;
  
      case 2:
        if (this.globalTime > 60000) {
          this.level = 3;
          this.missileMaxCount = 3;
          this.missileProbability = 1;
        }
        break;
    }
  }
}

/**
 * 
 * @param {Game} game 
 * @param {number} incrementScore 
 * @param {() => any} callback 
 */
function scoreTrigger(game, incrementScore, callback) {
  let lastScore = game.score;
  return () => {
    if (game.score - lastScore >= incrementScore) {
      lastScore = game.score;
      callback();
    }
  };
}