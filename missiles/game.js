class Game {
  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  constructor(ctx) {
    this.ctx = ctx;
    this.centered = true;
    this.frameCallback = null;
  }

  startFromTheBeginning() {
    this.paused = true;

    Timer.clearAll();

    /** @type {Entity[]} */
    this.flies = [];
    /** @type {Entity[]} */
    this.fliesToAddAfterTick = [];
    /** @type {Overlay[]} */
    this.overlays = [];
    this.triggers = [];
    this.gameIsOver = false;
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
    this.fakeTargetTimerId = null;
    this.outOfRange = false;
    this.fps = 0;
    /**@type {Map<string, {textSupplier, timerId, color}>} */
    this.infoItems = new Map();
    this.plane = new Plane(T.planeStartPos);
    this.level = new Level();

    let samplesCount = T.telemetryWindowSeconds*T.telemetrySamplesPerSecond;
    this.telemetry = new TelemetryCollector(1000/T.telemetrySamplesPerSecond, this, samplesCount);
    this.detector = new Detector(samplesCount);

    GamePlugins.preInit(this)
    .then(() => {      
      this.addOverlay(this.level);
      this.addEntity(this.plane);
      this.level.init(this);

      this.addTrigger(this.telemetry.toTrigger());
      Timer.periodic(() => this.detector.detect(game.telemetry), T.detectorIntervalMs);

      GamePlugins.init(this);

      this.resume();
    });
  }

  incrementFakeTargets(inc) {
    this.fakeTargets += inc;
    this.level.changed(this);
    // this.achivement(T.fakeTarget + " +" + inc, T.fakeTargetColor);
    this.addInfo("fake targerts", () => t`${T.fakeTarget} +${inc}`, 3000, T.fakeTargetColor)
  }

  decrementFakeTargets(dec) {
    this.fakeTargets -= dec;
    this.level.changed(this);
  }

  /**
   * @param {number} inc 
   * @param {Entity=} source 
   */
  incrementLifes(inc, source) {
    this.lifes += inc;
    this.level.changed(this);
    this.achivement(t`${T.life} +${inc}`, T.lifeColor, 2000, source);
    // this.addInfo("life", () => t`${T.life} +${inc}`, 3000, T.lifeColor);
  }

  decrementLifes(dec) {
    this.lifes -= dec;
    this.level.changed(this);
  }

  /**
   * @param {number} inc 
   * @param {Entity=} source 
   */
  incrementScore(inc, source) {
    this.score += inc;
    this.level.changed(this);
    this.achivement(t`+${inc}`, T.scoreColor, 2000, source);
  }

  decrementScore(dec) {
    this.score -= dec;
    this.level.changed(this);
  }

  incrementBooster(inc) {
    this.booster += inc;
    this.level.changed(this);
    //this.achivement(T.booster + " +" + Math.round(inc/1000), T.boosterColor);
    this.addInfo("booster", () => t`${T.booster} +${Math.round(inc/1000)}`, 3000, T.boosterColor);
  }

  decrementBooster(dec) {
    this.booster -= dec;
    this.level.changed(this);
  }

  /**
   * @param {string} message 
   * @param {string} color 
   * @param {number} time 
   * @param {Entity=} source 
   */
  achivement(message, color, time, source) {
    this.addEntity(new Achivement((source || this.plane).xy, message, color, time));
  }

  /**
   * @param {string} id 
   * @param {(() => string) | string} textSupplier 
   * @param {number=} intervalMs
   * @param {string=} color
   */
  addInfo(id, textSupplier, intervalMs, color) {
    if (typeof textSupplier != "function") {
      let text = textSupplier.toString();
      textSupplier = () => text;
    }

    this.removeInfo(id);
    let timerId = intervalMs !== undefined && intervalMs > 0
      ? Timer.set(() => this.removeInfo(id), intervalMs)
      : null;
    this.infoItems.set(id, {textSupplier, timerId, color});

  }

  /**
   * @param {string} id 
   */
  removeInfo(id) {
    let info = this.infoItems.get(id);
    if (info !== undefined) {
      if (info.timerId !== null) Timer.clear(info.timerId);
      this.infoItems.delete(id);
    }
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

  /**
   * @param {(dt: number) => void} trigger
   */
  addTrigger(trigger) {
    this.triggers.push(trigger);
  }

  /**
   * @param {Overlay} overlay
   */
  addOverlay(overlay) {
    this.overlays.push(overlay);
  }

  init() {
    Keys.resetToRoot();
    Keys.push();

    Keys.key("F1", [], t`Show this help message (F1 again to hide)`, () => {
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
      Keys.key("Escape", [], t`Hide help message`, () => hide());
      Keys.key("F1", [], t`Hide help message`, () => hide());

      this.pause();

      el.innerHTML =
        "<h2>" + t`Keyboard` + "</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>"
        ;

      el.style.display = "block";
    });
    Keys.key("ArrowRight", [], t`Turn right`,
      () => { this.rotationDirection = "right"; this.plane.right(); },
      () => { if (this.rotationDirection == "right") this.plane.noRotate(); });
    Keys.key("ArrowLeft", [], t`Turn left`,
      () => { this.rotationDirection = "left"; this.plane.left() },
      () => { if (this.rotationDirection == "left") this.plane.noRotate(); });
    Keys.key("KeyF", [], t`Fast/Unfast`,
      () => {
        if (this.timeScale < 1) {
          this.timeScale = 1;
        } else {
          this.timeScale = Math.max(this.timeScale / 1.8, .01);
        }
      });
    Keys.key("KeyS", [], t`Slowmo/Unslowmo`,
      () => {
        if (this.timeScale > 1) {
          this.timeScale = 1;
        } else {
          this.timeScale = Math.min(this.timeScale * 2.5, 10);
        }
      });
    Keys.key("ArrowUp", [], t`Boost/Unboost`,
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
    Keys.key("ArrowDown", [], t`Unboost`,
    () => {
      if (this.boosterIsUsed) {
        this.plane.maxVelocity = 100/1000;
        this.plane.stopBoost();
        this.boosterIsUsed = false;
      }
    });
    Keys.key("Escape", [], t`Start from the beginning`, () => this.startFromTheBeginning());
    Keys.key("KeyP", [], t`Pause`, () => {
      if (this.gameIsOver) return;
      this.pause();
      message(t`Paused`, () => this.resume());
    });
    Keys.key("Space", [], t`Launch fake targets`, () => this.launchFakeTarget());
    Keys.key("KeyC", [], t`Center/Uncenter`, () => this.centered = !this.centered);
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
      this.triggers.forEach(trigger => trigger(dt));
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
            if (first instanceof Missile) this.level.onDeadMissile(first);
            if (second instanceof Missile) this.level.onDeadMissile(second);
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
    this.gameIsOver = true;
    const id = setTimeout(() => {
      this.pause();
      message(t`Game Over`, () => {
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
    this.ctx.fillStyle = this.outOfRange ? T.skyOutOfRangeColor : T.skyColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();
    this.overlays.forEach(it => it.drawPre(this.ctx));
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
    this._drawScore(this.ctx);
    this.ctx.restore();

    this.ctx.save();
    this._drawRadar(this.ctx);
    this.ctx.restore();

    this.ctx.save();
    this.overlays.forEach(it => it.drawPost(this.ctx));
    this.ctx.restore();

    this.ctx.save();
    this._drawInfo(this.ctx);
    this.ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawInfo(ctx) {
    const fontSize = T.infoFontSize;
    const h = fontSize + 5;
    const padding = 5;
    let x = (this.centered ? ctx.canvas.width / 2 : this.plane.xy[0]) + 20;
    let y = this.centered ? ctx.canvas.height / 2 : this.plane.xy[1];
    ctx.font = `${fontSize}px serif`;
    ctx.textBaseline = "top";
    ctx.globalAlpha = T.infoAlpha;
    for (let info of this.infoItems.values()) {
      let text = info.textSupplier();
      let m = ctx.measureText(text);

      // ctx.fillStyle = T.infoBgColor;
      // ctx.fillRect(x - padding, y - padding, m.width + 2*padding, fontSize + 2*padding);

      ctx.fillStyle = info.color || T.infoColor;
      ctx.fillText(text, x, y);

      y += h + 2*padding;
    }
  }

  _drawScore(ctx) {
    const fontSize = 14;

    const lineHeight = fontSize * 1.1;
    let y = lineHeight;
    
    ctx.font = fontSize + "px serif";

    ctx.fillStyle = "black";
    ctx.fillText("FPS: " + Math.round(this.fps), 0, y);
    y += lineHeight;

    ctx.fillStyle = T.timeColor;
    ctx.fillText(t`${T.time} ${Math.round(this.globalTime / 1000)}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.scoreColor;
    ctx.fillText(t`${T.score} ${this.score}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.fakeTargetColor;
    ctx.fillText(t`${T.fakeTarget} ${this.fakeTargets}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.boosterColor;
    ctx.fillText(t`${T.booster} ${Math.round(this.booster / 1000)}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.lifeColor;
    ctx.fillText(t`${T.life} ${this.lifes}`, 0, y);
    y += lineHeight;

    ctx.save();
    this._drawRadar(ctx);
    ctx.restore();
  }

    /**
   * @param {CanvasRenderingContext2D} targetCtx
   */
  _drawRadar(targetCtx) {
    const radarR = T.radarSize;
    const z = T.radarScale;

    if (!this.radarCtx) {
      const radarCanvas = document.createElement("canvas");
      radarCanvas.width = 2*radarR + 5;
      radarCanvas.height = 2*radarR + 5;
      this.radarCtx = radarCanvas.getContext("2d");
    }

    const ctx = this.radarCtx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();

    ctx.clearRect(0, 0, w, h);

    const aspect = targetCtx.canvas.height/targetCtx.canvas.width;
    ctx.scale(1, aspect);

    const rx = w/2;
    const ry = h/2;

    ctx.fillStyle = T.radarFillColor;
    ctx.strokeStyle = T.radarStrokeColor;
    // radar border
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.stroke();
    // radar sectors
    ctx.strokeStyle = T.radarSectorColor;
    const N = 6;
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      const angle = 2*Math.PI/N*i;
      ctx.lineTo(rx + Math.cos(angle)*radarR, ry + Math.sin(angle)*radarR);
      ctx.stroke();
    }
    // clip out everything outside radar area
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.clip();

    // plane visibiity region
    ctx.strokeStyle = T.radarVisibilityAreaColor;
    ctx.beginPath();
    ctx.arc(rx, ry, targetCtx.canvas.height/2/z, 0, 2*Math.PI);
    ctx.stroke();

    // scale and translate everything to radar center
    ctx.scale(1/z, 1/z);
    ctx.translate(-this.plane.xy[0], -this.plane.xy[1]);
    ctx.translate(w/2*z, h/2*z);
    
    // plane
    ctx.strokeStyle = T.radarPlaneColor;
    ctx.lineWidth = z;
    ctx.beginPath();
    ctx.moveTo(this.plane.xy[0], this.plane.xy[1] - 3*z/aspect);
    ctx.lineTo(this.plane.xy[0], this.plane.xy[1] + 3*z/aspect);
    ctx.moveTo(this.plane.xy[0] - 3*z, this.plane.xy[1]);
    ctx.lineTo(this.plane.xy[0] + 3*z, this.plane.xy[1]);
    ctx.stroke();

    // draw missiles and perks
    for (let fly of this.flies) {
      if (fly instanceof Missile || fly instanceof Perk) {
        ctx.save();
        ctx.fillStyle = fly instanceof Missile ? T.radarMissileColor : T.radarPerkColor;
        ctx.beginPath();
        ctx.ellipse(fly.xy[0], fly.xy[1], 2*z, 2*z/aspect, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();
      } else {
        // fly.draw(ctx);
      }
    }

    ctx.restore();

    // draw radar at the main canvas
    targetCtx.globalAlpha = T.radarAlpha;
    targetCtx.drawImage(ctx.canvas, targetCtx.canvas.width - 2*radarR - 10, 10);
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
