class Game {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.centered = true;
    this.startFromTheBeginning();
    this.frameCallback = null;
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
    this.fakeTargets = 2;
    this.boosterIsUsed = false;
    this.globalTime = 0;
    this.rotationDirection = null;
    this.fps = 0;

    this.plane = new Plane([this.ctx.canvas.width / 2, this.ctx.canvas.height / 2]);
    this.level = new Level();

    this.addEntity(this.plane);
    this.level.init(this);

    this.resume();
  }

  incrementFakeTargets(inc) {
    this.fakeTargets += inc;
    this.level.changed(this);
    this.achivement("Fake Targets +1");
  }

  decrementFakeTargets(dec) {
    this.fakeTargets -= dec;
    this.level.changed(this);
  }

  incrementLifes(inc) {
    this.lifes += inc;
    this.level.changed(this);
    this.achivement("Lifes +1");
  }

  decrementLifes(dec) {
    this.lifes -= dec;
    this.level.changed(this);
  }

  incrementScore(inc) {
    this.score += inc;
    this.level.changed(this);
  }

  decrementScore(dec) {
    this.score -= dec;
    this.level.changed(this);
  }

  incrementBooster(inc) {
    this.booster += inc;
    this.level.changed(this);
    this.achivement("Booster +" + inc);
  }

  decrementBooster(dec) {
    this.booster -= dec;
    this.level.changed(this);
  }

  achivement(message) {
    this.addEntity(new Achivement(this.plane.xy, message));
  }

  /**
   * @param {Entity} entity 
   */
  addEntity(entity) {
    if (this.inbetween) this.fliesToAddAfterTick.push(entity);
    else {
      this.flies.push(entity);
      this._sort();
      this.level.changed(this);
    }
  }

  addNewFlies() {
    if (this.fliesToAddAfterTick.length > 0) {
      this.fliesToAddAfterTick.forEach(o => this.flies.push(o));
      this._sort();
      this.fliesToAddAfterTick = [];
      this.level.changed(this);
    }
  }

  _sort() {
    this.flies.sort((a, b) => a.layer > b.layer ? 1 : (a.layer == b.layer ? 0 : -1));
  }

  addTrigger(trigger) {
    this.triggers.push(trigger);
  }

  init() {
    Keys.resetToRoot();
    Keys.push();

    Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
      let el = document.getElementById("help");

      let snapshot;
      const hide = () => {
        Keys.restoreFromSnapshot(snapshot);
        this.resume();
        el.style.display = "none";
      }

      if (el.style.display == "block") {
        hide();
        return;
      }

      let help = Keys.help();
      snapshot = Keys.snapshot();
      Keys.resetToRoot();
      Keys.key("Escape", [], "Hide help message", () => hide());
      Keys.key("F1", [], "Hide help message", () => hide());

      this.pause();

      el.innerHTML =
        "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>"
        // + "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>"
        ;

      el.style.display = "block";
    });
    Keys.key("ArrowRight", [], "Turn right",
      () => { this.rotationDirection = "right"; this.plane.right(); },
      () => { if (this.rotationDirection == "right") this.plane.noRotate(); });
    Keys.key("ArrowLeft", [], "Turn left",
      () => { this.rotationDirection = "left"; this.plane.left() },
      () => { if (this.rotationDirection == "left") this.plane.noRotate(); });
    Keys.key("ArrowDown", [], "Slowmo/Unslowmo",
      () => {
        if (this.timeScale > 1) {
          this.timeScale = 1;
        } else {
          this.timeScale = Math.min(this.timeScale * 2.5, 10);
        }
      });
    Keys.key("ArrowUp", [], "Boost/Unboost",
      () => {
        if (this.boosterIsUsed) {
          this.plane.maxVelocity = 100/1000;
          this.plane.stopBoost();
        } else {
          this.plane.maxVelocity = (this.booster > 0 ? 150/1000 : 100/1000);
          this.plane.startBoost();
        }
        this.boosterIsUsed = !this.boosterIsUsed;
      });
    Keys.key("Escape", [], "Start from the beginning", () => this.startFromTheBeginning());
    Keys.key("KeyP", [], "Pause", () => {
      this.pause();
      message("Paused", () => this.resume());
    });
    Keys.key("Space", [], "Launch fake targets", () => this.launchFakeTarget());
    Keys.key("KeyC", [], "Center/Uncenter", () => this.centered = !this.centered);
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

      if (this.frameCallback) this.frameCallback();

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
        this.plane.stopBoost();
      }
    }
  }

  wrapAround(xy) {
    if (this.centered) return xy;

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
      if (gameOver) this.gameOver();
    }
  }

  gameOver() {
    const id = setTimeout(() => {
      this.pause();
      message("Game Over", () => {
        clearTimeout(id);
        this.startFromTheBeginning();
      });
    }, 2000);
  }
  
  explosionFor(o) {
    o.dead = true;
    this.addEntity(new Explosion(o.xy, o instanceof Plane ? 5 : 1));
  }

  draw() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();
    this.level.drawPre(this.ctx);
    this.ctx.restore();

    this.ctx.save();
    if (this.centered) {
      this.ctx.translate(-this.plane.xy[0] + this.ctx.canvas.width/2, -this.plane.xy[1] + this.ctx.canvas.height/2);
    }
    this.flies.forEach(fly => {
      this.ctx.save();
      fly.draw(this.ctx);
      this.ctx.restore();
    });
    this.ctx.restore();

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

  launchFakeTarget() {
    if (this.fakeTargets <= 0) return;
    const radius = 200;

    if (!this.fakeTargetTimerId) {
      this.fakeTargetTimerId = Timer.set(() => {
        this.plane.hideFakeTargetRadius();
        this.fakeTargetTimerId = null;
      }, 2000);
      this.plane.showFakeTargetRadius(radius);
      return;
    }

    this.decrementFakeTargets(1);

    const fakeTarget = new FakeTarget(this.plane);
    this.addEntity(fakeTarget);
    this.flies
      .filter(it => it instanceof Missile)
      .filter(it => V.length(V.subtract(it.xy, this.plane.xy)) <= radius)
      .forEach(it => it.retarget(fakeTarget));
  }
}
