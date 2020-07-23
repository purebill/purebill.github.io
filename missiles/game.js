import GamePlugins from './plugins.js'
import Timer from './timer.js';
import { Entity, Plane, Achivement, Fly, Obstacle, Perk, Missile, Explosion, FakeTarget, Event } from './model.js';
import { Level } from './level.js';
import Keys from './keys.js';
import { message } from './message.js';
import { Overlay } from './overlay.js';

export class Game {
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean=} localMode
   * @param {string=} userId
   */
  constructor(ctx, localMode, userId) {
    this.localMode = localMode === undefined ? true : localMode;
    this.userId = userId;
    this.masterGameNode = false;
    this.ctx = ctx;
    this.centered = true;
    this.frameCallback = null;
    this.gameOverCallback = null;
    this.newGameCallback = null;
    this._init();
  }

  startFromTheBeginning() {
    this.paused = true;

    Timer.clearAll();

    /** @type {Entity[]} */
    this.flies = [];
    /** @type {Map<string, Entity>} */
    this.fliesById = new Map();
    /** @type {Entity[]} */
    this.fliesToAddAfterTick = [];
    /** @type {Overlay[]} */
    this.overlays = [];
    this.triggers = [];
    this.gameIsOver = false;
    this.inbetween = false;
    this.lastT = null;
    this.timeScale = 1;
    this.boosterIsUsed = false;
    this.globalTime = 0;
    this.rotationDirection = null;
    this.fakeTargetTimerId = null;
    this.outOfRange = false;
    this.fps = 0;
    this.plane = new Plane(T.planeStartPos);
    this.plane.subscribe(event => this._onPlaneEvent(event));
    if (this.userId) this.plane.id = this.userId;
    this.level = new Level();

    this.addOverlay(this.level);
    this.addEntity(this.plane);
    this.level.init(this);

    GamePlugins.init(this);

    this.resume();
  }

  /**
   * @param {Event} event 
   */
  _onPlaneEvent(event) {
    if (event instanceof Plane.LifeChanged) {
      if (event.amount > 0) this.achivement(t`${T.life} +${event.amount}`, T.lifeColor, 2000, event.target);
      if (event.target.lifes <= 0) this.explosionFor(event.target);
    }
    if (event instanceof Plane.FakeTargetsChanged && event.amount > 0) {
      event.target.addInfo("fake targerts", () => t`${T.fakeTarget} +${event.amount}`, 3000, T.fakeTargetColor);
    }
    if (event instanceof Plane.BoosterChanged && event.amount > 0) {
      event.target.addInfo("booster", () => t`${T.booster} +${Math.round(event.amount/1000)}`, 3000, T.boosterColor);
    }
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
    this.plane.addInfo(id, textSupplier, intervalMs, color);
  }

  /**
   * @param {string} id 
   */
  removeInfo(id) {
    this.plane.removeInfo(id);
  }

  /**
   * @param {Entity} entity 
   */
  addEntity(entity) {
    if (this.inbetween) this.fliesToAddAfterTick.push(entity);
    else {
      this.flies.push(entity);
      this.fliesById.set(entity.id, entity);
      this._sort();
    }
  }

  _addNewFlies() {
    if (this.fliesToAddAfterTick.length > 0) {
      this.fliesToAddAfterTick.forEach(o => {
        this.flies.push(o);
        this.fliesById.set(o.id, o);
      });
      this._sort();
      this.fliesToAddAfterTick = [];
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

  _init() {
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
          this.plane.maxVelocity = (this.plane.booster > 0 ? 150/1000 : 100/1000);
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
    Keys.key("Escape", [], t`Start from the beginning`, () => this.gameOver(0));
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

      if (dt > 0) this.fps = (this.fps*100 + 1000 / dt) / 101;
      else this.fps = 0;

      dt /= this.timeScale;
      this.lastT = t;

      this.globalTime += dt;

      this.level.progress(dt);
      this.updateBooster(dt);
      this.progress(dt);
      this._detectCollision();
      this.triggers.forEach(trigger => trigger(dt));
      this._removeDead();
      this._addNewFlies();
      this.draw();

      if (this.frameCallback) this.frameCallback();

      requestAnimationFrame(t => this.frame(t));
    } finally {
      this.inbetween = false;
    }
  }

  updateBooster(dt) {
    if (this.boosterIsUsed) {
      this.plane.booster -= dt;
      if (this.plane.booster <= 0) {
        this.plane.booster = 0;
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

  _detectCollision() {
    if (!this.localMode && !this.masterGameNode) return;

    for (let i = 0; i < this.flies.length; i++) {
      for (let j = i + 1; j < this.flies.length; j++) {
        const first = this.flies[i];
        const second = this.flies[j];
        
        if (first instanceof Obstacle && second instanceof Obstacle) continue;

        if (first.colideWith(second)) {
          if (first instanceof Plane && second instanceof Plane) {
            // permanent death
            first.lifes = 1;
            second.lifes = 1;
            first.lifes -= 1;
            second.lifes -= 1;
            continue;
          }

          const oneIsPlane = first instanceof Plane || second instanceof Plane;
          if (oneIsPlane) {
            const other = first instanceof Plane ? second : first;
            const plane = first instanceof Plane ? first : second;

            if (other instanceof Perk) {
              other.collected(plane);
              continue;
            }

            if (other instanceof Obstacle) {
              plane.lifes = 1; // permanent death
            } else {
              this.explosionFor(other);
            }

            plane.lifes -= 1;
            continue;
          } else {
            if (first instanceof Missile) this.level.onDeadMissile(first);
            if (second instanceof Missile) this.level.onDeadMissile(second);
            
            if (!(first instanceof Obstacle)) this.explosionFor(first);
            if (!(second instanceof Obstacle)) this.explosionFor(second);
          }
        }
      }
    }
  }

  _removeDead() {
    const toRemove = this.flies.filter(o => o.dead);
    if (toRemove.length > 0) {
      let gameOver = false;
      toRemove.forEach(o => {
        if (o === this.plane) gameOver = true;
        let deleted = this.flies.splice(this.flies.indexOf(o), 1);
        deleted.forEach(it => this.fliesById.delete(it.id));
      });
      if (gameOver) this.gameOver();
    }
  }

  gameOver(delay) {
    this.gameIsOver = true;
    if (this.gameOverCallback !== null) this.gameOverCallback();
    const id = setTimeout(() => {
      this.pause();
      message(t`Game Over`, () => {
        clearTimeout(id);
        if (this.newGameCallback !== null) this.newGameCallback();
        else this.startFromTheBeginning();
      });
    }, delay !== undefined ? delay : 2000);
  }
  
  explosionFor(o) {
    o.dead = true;
    this.addEntity(new Explosion(o.xy, o instanceof Plane ? 5 : 1));
  }

  draw() {
    this.ctx.fillStyle = this.outOfRange ? T.skyOutOfRangeColor : T.skyColor;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.ctx.save();
    this.overlays.forEach(it => it.drawPre && it.drawPre(this.ctx));
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
    this.overlays.forEach(it => it.drawPost && it.drawPost(this.ctx));
    this.ctx.restore();
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
    ctx.fillText(t`${T.score} ${this.plane.score}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.fakeTargetColor;
    ctx.fillText(t`${T.fakeTarget} ${this.plane.fakeTargets}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.boosterColor;
    ctx.fillText(t`${T.booster} ${Math.round(this.plane.booster / 1000)}`, 0, y);
    y += lineHeight;

    ctx.fillStyle = T.lifeColor;
    ctx.fillText(t`${T.life} ${this.plane.lifes}`, 0, y);
    y += lineHeight;
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
    const planeSize = 3;
    ctx.strokeStyle = T.radarPlaneColor;
    ctx.lineWidth = z;
    ctx.beginPath();
    ctx.moveTo(this.plane.xy[0], this.plane.xy[1] - planeSize*z/aspect);
    ctx.lineTo(this.plane.xy[0], this.plane.xy[1] + planeSize*z/aspect);
    ctx.moveTo(this.plane.xy[0] - planeSize*z, this.plane.xy[1]);
    ctx.lineTo(this.plane.xy[0] + planeSize*z, this.plane.xy[1]);
    ctx.stroke();

    // draw missiles and perks
    for (let fly of this.flies) {
      ctx.save();
      if (fly !== this.plane && fly instanceof Plane) {
        ctx.strokeStyle = T.radarEnemyColor;
        ctx.beginPath();
        ctx.moveTo(fly.xy[0] - planeSize*z, fly.xy[1]);
        ctx.lineTo(fly.xy[0] + planeSize*z, fly.xy[1]);
        ctx.moveTo(fly.xy[0], fly.xy[1] - planeSize*z/aspect);
        ctx.lineTo(fly.xy[0], fly.xy[1] + planeSize*z/aspect);
        ctx.stroke();
      } else if (fly instanceof Missile || fly instanceof Perk) {
        ctx.fillStyle = fly instanceof Missile ? T.radarMissileColor : T.radarPerkColor;
        ctx.beginPath();
        ctx.ellipse(fly.xy[0], fly.xy[1], 2*z, 2*z/aspect, 0, 0, 2*Math.PI);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.4;
        fly.draw(ctx);
      }
      ctx.restore();
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
    if (this.plane.fakeTargets <= 0) return;

    if (!this.fakeTargetTimerId) {
      this.fakeTargetTimerId = Timer.set(() => {
        this.plane.hideFakeTargetRadius();
        this.fakeTargetTimerId = null;
      }, 2000);
      this.plane.showFakeTargetRadius(T.fakeTargetRadius);
      return;
    }

    this.plane.fakeTargets -= 1;

    const fakeTarget = new FakeTarget(this.plane);
    this.addEntity(fakeTarget);
    // this.flies
    //   .filter(it => it instanceof Missile)
    //   .filter(it => V.length(V.subtract(it.xy, this.plane.xy)) <= T.fakeTargetRadius)
    //   .forEach(it => it.retarget(fakeTarget));
  }
}
