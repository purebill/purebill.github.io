class Game {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.startFromTheBeginning();
  }

  startFromTheBeginning() {
    Timer.clearAll();
    
    /** @type {Entity[]} */
    this.flies = [];
    /** @type {Entity[]} */
    this.fliesToAddAfterTick = [];
    this.triggers = [];
    this.paused = true;
    this.inbetween = false;
    this.lastT = null;
    this.timeScale = 1;
    this.score = 0;
    this.lifes = 1;
    this.booster = 10000;
    this.boosterIsUsed = false;
    this.globalTime = 0;
    this.rotationDirection = null;
    this.fps = 0;

    this.plane = new Plane([this.ctx.canvas.width / 2, this.ctx.canvas.height / 2]);
    this.addEntity(this.plane);

    this.level = new Level();
    this.level.init(this);
  }

  incrementLifes(inc) {
    this.lifes += inc;
  }

  decrementLifes(dec) {
    this.lifes -= dec;
  }

  incrementScore(inc) {
    this.score += inc;
  }

  decrementScore(dec) {
    this.score -= dec;
  }

  incrementBooster(inc) {
    this.booster += inc;
  }

  decrementBooster(dec) {
    this.booster -= dec;
  }

  /**
   * @param {Entity} entity 
   */
  addEntity(entity) {
    if (this.inbetween) this.fliesToAddAfterTick.push(entity);
    else this.flies.push(entity);
  }

  addTrigger(trigger) {
    this.triggers.push(trigger);
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
    Keys.key("Escape", [], "Start from the beginning", () => this.startFromTheBeginning());
    Keys.key("Space", [], "Pause/Resume", () => this.paused ? this.resume() : this.pause());
    Keys.key("NumpadAdd", [], "Slower", () => this.timeScale = Math.min(this.timeScale * 2, 10));
    Keys.key("NumpadSubtract", [], "Faster", () => this.timeScale = Math.max(this.timeScale / 2, 1));
    // Keys.mouse(0, [], "Missile", e => {
    //   if (this.paused) {
    //     this.addEntity(new Obstacle(new CircleRegion([e.offsetX, e.offsetY], 10)));
    //     this.addNewFlies();
    //     this.draw();
    //   }
    // });
  }

  frame(t) {
    if (this.paused) return;

    this.inbetween = true;
    try {
      if (this.lastT === null) this.lastT = t;
      let dt = t - this.lastT;

      Timer.progress(dt);

      if (dt > 0) this.fps = (this.fps + 1000 / dt) / 2;

      dt /= this.timeScale;
      this.lastT = t;

      this.globalTime += dt;

      this.level.progress(dt);
      this.updateBooster(dt);
      this.progress(dt);
      this.detectCollision();
      this.removeDead();
      this.addNewFlies();
      this.triggers.forEach(trigger => trigger());
      this.draw();

      requestAnimationFrame(t => this.frame(t));
    } finally {
      this.inbetween = false;
    }
  }

  updateBooster(dt) {
    if (this.boosterIsUsed) {
      this.decrementBooster(dt);
      if (this.booster <= 0) {
        this.booster = 0;
        this.boosterIsUsed = false;
        this.plane.maxVelocity = 100/1000;
      }
    }
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
        
        if (first instanceof Obstacle && second instanceof Obstacle) continue;

        if (first.colideWith(second)) {
          const oneIsPlane = first === this.plane || second === this.plane;

          if (first instanceof Perk || second instanceof Perk) {
            if (oneIsPlane) {
              ((first instanceof Perk) ? first : second).collected(this);
            }
            continue;
          }

          if (oneIsPlane) {
            const other = first === this.plane ? second : first;

            if (other instanceof Obstacle) {
              this.lifes = 1; // permanent death
            } else {
              this.explosionFor(other);
            }

            this.decrementLifes(1);
            if (this.lifes <= 0) this.explosionFor(this.plane);
            continue;
          }

          if (!oneIsPlane) {
            if (first instanceof Missile) this.level.onDeadMissile();
            if (second instanceof Missile) this.level.onDeadMissile();
          }

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
        this.flies.splice(this.flies.indexOf(o), 1);
      });
      if (gameOver) setTimeout(() => this.startFromTheBeginning(), 3000);
    }
  }
  
  explosionFor(o) {
    o.dead = true;
    this.addEntity(new Explosion(o.xy));
  }

  addNewFlies() {
    if (this.fliesToAddAfterTick.length > 0) {
      this.fliesToAddAfterTick.forEach(o => this.flies.push(o));
      this.fliesToAddAfterTick = [];
    }
  }

  draw() {
    this.ctx.save();
    this.level.drawPre(this.ctx);
    this.ctx.restore();

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.flies.forEach(fly => {
      this.ctx.save();
      fly.draw(this.ctx);
      this.ctx.restore();
    });

    this.ctx.save();
    this.level.drawPost(this.ctx);
    this.ctx.restore();
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