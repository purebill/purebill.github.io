import { animateOnTimer, TimingFunction, animate } from "./animation.js";
import { Region, CircleRegion } from "./region.js";
import V from "./vector.js";
import Timer from "./timer.js";
import Uid from "./uid.js";
import Serialization from "./serialization.js";

export class Event {
  constructor() {
    /**@type {Entity} */
    this.target = null;
  }
}

export class Entity {
  /**
   * @param {number[]} xy 
   */
  constructor(xy) {
    this.xy = V.clone(xy);
    this.dead = false;
    this.layer = 0;
    this.id = Entity.idPrefix + "-" + Entity.idIndex++;
    /**@type {Map<string, {textSupplier, timerId, color}>} */
    this.infoItems = new Map();

    /**@type {((event: Event) => void)[]} */
    this._subscribers = [];
  }

  /**
   * @param {Event} event 
   */
  emit(event) {
    event.target = this;
    this._subscribers.forEach(sub => sub(event));
  }

  /**
   * @param {(event: Event) => void} subscriber
   */
  subscribe(subscriber) {
    this._subscribers.push(subscriber);
  }

  __serialize() {
    return {
      xy: this.xy,
      dead: this.dead,
      id: this.id
    };
  }

  __unserialize(pojo) {
    this.xy = pojo.xy;
    this.dead = pojo.dead;
    this.id = pojo.id;
  }

  /**
   * @returns {Region}
   */
  getColideRegion() {
    return Region.EMPTY;
  }

  progress(dt) {
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this._drawInfo(ctx);
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
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawInfo(ctx) {
    ctx.save();
    const fontSize = T.infoFontSize;
    const lineSpacing = T.infoFontSize/2;
    const h = fontSize + lineSpacing;
    const padding = lineSpacing/2;
    let x = this.xy[0] + 20;
    let y = this.xy[1];
    ctx.font = `${fontSize}px serif`;
    ctx.textBaseline = "top";
    ctx.globalAlpha = T.infoAlpha;
    for (let info of this.infoItems.values()) {
      let text = info.textSupplier();

      // let m = ctx.measureText(text);
      // ctx.fillStyle = T.infoBgColor;
      // ctx.fillRect(x - padding, y - padding, m.width + 2*padding, h + 2*padding);

      ctx.fillStyle = info.color || T.infoColor;
      ctx.fillText(text, x, y);

      y += h;
    }
    ctx.restore();
  }

  /**
   * @param {(ctx: CanvasRenderingContext2D) => void} enhancer 
   * @returns {() => void}
   */
  enhanceDrawWith(enhancer) {
    let oldDraw = this.draw;
    this.draw = ctx => {
      oldDraw.call(this, ctx);
      enhancer.call(this, ctx);
    };
    return () => this.draw = oldDraw;
  }

  colideWith(other) {
    return Region.intersects(this.getColideRegion(), other.getColideRegion());
  }
}

Serialization.registerConstructor(Entity.__type = "Entity", pojo => new Entity(pojo.xy));

Entity.idPrefix = Uid.get();
Entity.idIndex = 0;

export class Fly extends Entity {
  constructor(xy, m, v, size) {
    super(xy);
    this.m = m;
    this.v = V.clone(v);
    this.size = size;
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.m = this.m;
    pojo.v = this.v;
    pojo.size = this.size;
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this.m = pojo.m;
    this.v = pojo.v;
    this.size = pojo.size;
  }

  /**
   * @returns {Region}
   */
  getColideRegion() {
    return new CircleRegion(this.xy, this.size);
  }

  progress(dt) {
    const dxy = V.mulByScalar(this.v, dt);
    this.xy = V.add(this.xy, dxy);
  }

  applyForce(f, dt) {
    const dv = V.mulByScalar(f, dt / this.m);
    this.v = V.add(this.v, dv);
  }

  applyRotation(omega, dt) {
    this.v = V.rotate(this.v, omega * dt);
  }
}

Serialization.registerConstructor(Fly.__type = "Fly", pojo => new Fly(pojo.xy, pojo.m, pojo.v, pojo.size));

export class Trail extends Fly {
  constructor(xy, m, v, size) {
    super(xy, m, v, size);

    this.tail = [];
    this.lastXy = null;
    this.progressTrail = true;
    this.fadingAlpha = null;
  }

  __serialize() {
    let pojo = super.__serialize();
    return pojo;
  }

  _stopTrailing(periodToFade) {
    this.progressTrail = false;
    animateOnTimer([1], [0], periodToFade/10, periodToFade, TimingFunction.linear(0), v => this.fadingAlpha = v, null);
  }

  progress(dt) {
    super.progress(dt);

    if (!this.progressTrail) return;

    if (this.lastXy === null) this.lastXy = this.xy;

    if (V.length(V.subtract(this.xy, this.lastXy)) > 10) {
      this.tail.push(this.xy);
      this.lastXy = this.xy;
      if (this.tail.length > 20) {
        this.tail.splice(0, this.tail.length - 20);
      }
    }
  }

  draw(ctx) {
    super.draw(ctx);

    if (this.fadingAlpha !== null) ctx.globalAlpha = this.fadingAlpha;

    if (this.tail.length === 0) return;

    const color = animate(T.trailStartColor, T.trailEndColor, 1, this.tail.length, TimingFunction.linear(0));
    for (let i = 1; i < this.tail.length; i++) {
      const c = color(i);
      ctx.strokeStyle = rgb(c);
      ctx.beginPath();
      ctx.moveTo(this.tail[i-1][0], this.tail[i-1][1]);
      ctx.lineTo(this.tail[i][0], this.tail[i][1]);
      ctx.stroke();
    }

    if (this.progressTrail) {
      const c = color(this.tail.length);
      ctx.strokeStyle = rgb(c);
      ctx.beginPath();
      ctx.moveTo(this.xy[0], this.xy[1]);
      ctx.lineTo(this.tail[this.tail.length - 1][0], this.tail[this.tail.length - 1][1]);
      ctx.stroke();
    }
  }
}

Serialization.registerConstructor(Trail.__type = "Trail", pojo => new Trail(pojo.xy, pojo.m, pojo.v, pojo.size));

export class Plane extends Fly {
  constructor(xy) {
    const maxVelocity = 100/1000;
    super(xy, 1, [0, -maxVelocity], 7);

    this._lifes = 1;
    this._fakeTargets = 2;
    this._score = 0;
    this._booster = 10000;

    this.layer = 100;
    this.omega = null;
    this.hangForce = null;
    this.boostForce = null;
    this.minVelocity = 10/1000;
    this.maxVelocity = maxVelocity;
    this.void = true;
    Timer.set(() => this.void = false, T.planeBirthVoidPeriod);
  }

  set lifes(newValue) {
    if (newValue < 0) newValue = 0;

    let amount = newValue - this._lifes;
    this._lifes = newValue;
    this.emit(new Plane.LifeChanged(amount));
  }

  get lifes() {
    return this._lifes;
  }

  set fakeTargets(newValue) {
    if (newValue < 0) newValue = 0;

    let amount = newValue - this._fakeTargets;
    this._fakeTargets = newValue;
    this.emit(new Plane.FakeTargetsChanged(amount));
  }

  get fakeTargets() {
    return this._fakeTargets;
  }

  set score(newValue) {
    if (newValue < 0) newValue = 0;

    let amount = newValue - this._score;
    this._score = newValue;
    this.emit(new Plane.ScoreChanged(amount));
  }

  get score() {
    return this._score;
  }

  set booster(newValue) {
    if (newValue < 0) newValue = 0;

    let amount = newValue - this._booster;
    this._booster = newValue;
    this.emit(new Plane.BoosterChanged(amount));
  }

  get booster() {
    return this._booster;
  }

  getColideRegion() {
    if (this.void) return Region.EMPTY;
    else return super.getColideRegion();
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.maxVelocity = this.maxVelocity;
    pojo.omega = this.omega;
    pojo.hangForce = this.hangForce;
    pojo.boostForce = this.boostForce;
    pojo.minVelocity = this.minVelocity;
    pojo.maxVelocity = this.maxVelocity;
    pojo.void = this.void;
    pojo.lifes = this.lifes;
    pojo.fakeTargets = this.fakeTargets;
    pojo.score = this.score;
    pojo.booster = this.booster;
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this.maxVelocity = pojo.maxVelocity;
    this.omega = pojo.omega;
    this.hangForce = pojo.hangForce;
    this.boostForce = pojo.boostForce;
    this.minVelocity = pojo.minVelocity;
    this.maxVelocity = pojo.maxVelocity;
    this.void = pojo.void;
    this.lifes = pojo.lifes;
    this.fakeTargets = pojo.fakeTargets;
    this.score = pojo.score;
    this.booster = pojo.booster;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    super.draw(ctx);

    const nv = V.normalize(this.v);
    const tail = V.subtract(this.xy, V.mulByScalar(nv, this.size/7*5));
    const head = V.add(this.xy, V.mulByScalar(nv, this.size/7*10));
    const left = V.subtract(this.xy, V.mulByScalar(V.normal(nv), this.size));
    const right = V.add(this.xy, V.mulByScalar(V.normal(nv), this.size));

    ctx.lineWidth = 3;
    if (this.void) ctx.globalAlpha = 0.2;

    ctx.strokeStyle = T.planeColor;
    ctx.beginPath();
    ctx.moveTo(tail[0], tail[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.moveTo(this.xy[0], this.xy[1]);
    ctx.lineTo(left[0], left[1]);
    ctx.moveTo(this.xy[0], this.xy[1]);
    ctx.lineTo(right[0], right[1]);
    ctx.stroke();

    if (this.boostForce !== null) {
      ctx.fillStyle = T.planeBoosterColor;
      ctx.globalAlpha = T.planeBoosterAlpha;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const p = V.add(V.subtract(this.xy, V.mulByScalar(nv, 5 + this.size/7*5*i/2)), V.random(1));
        ctx.arc(p[0], p[1], 2/(1+i/2), 0, 2*Math.PI);
        ctx.fill();
      }
    }

    if (this.fakeTargetRadius) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = T.planeFakeTargetRadiusColor;
      ctx.beginPath();
      ctx.arc(this.xy[0], this.xy[1], this.fakeTargetRadius, 0, 2*Math.PI);
      ctx.fill();
    }
  }

  progress(dt) {
    if (this.omega !== null) {
      this.applyRotation(this.omega, dt);
    }

    if (this.hangForce !== null) {
      const f = V.mulByScalar(V.normalize(this.v), -this.hangForce);
      this.applyForce(f, dt);
    }

    if (this.boostForce !== null) {
      const f = V.mulByScalar(V.normalize(this.v), this.boostForce);
      this.applyForce(f, dt);
    }

    const absV = V.length(this.v);
    if (absV < this.minVelocity) {
      this.v = V.mulByScalar(V.normalize(this.v), this.minVelocity);
    }
    if (absV > this.maxVelocity) {
      this.v = V.mulByScalar(V.normalize(this.v), this.maxVelocity);
    }
  
    super.progress(dt);
  }

  left() {
    this.omega = -0.004;
  }

  right() {
    this.omega = 0.004;
  }

  noRotate() {
    this.omega = null;
  }

  startHang() {
    this.hangForce = 0.0001;
  }

  stopHang() {
    this.hangForce = null;
  }

  startBoost() {
    this.boostForce = 0.0001;
  }

  stopBoost() {
    this.boostForce = null;
  }

  showFakeTargetRadius(r) {
    this.fakeTargetRadius = r;
  }

  hideFakeTargetRadius() {
    this.fakeTargetRadius = null;
  }
}

Serialization.registerConstructor(Plane.__type = "Plane", pojo => new Plane(pojo.xy));

class ChangedEvent extends Event {
  constructor(amount) {
    super();
    this.amount = amount;
  }
}

Plane.LifeChanged = class extends ChangedEvent {};
Plane.FakeTargetsChanged = class extends ChangedEvent {};
Plane.ScoreChanged = class extends ChangedEvent {};
Plane.BoosterChanged = class extends ChangedEvent {};

export class FakeTarget extends Fly {
  constructor(plane) {
    if (plane !== null) {
      const negV = V.negate(V.normalize(plane.v));
      const dAngle = Math.random()*2*Math.PI/10;
      const angle = dAngle - 2*dAngle;
      const v = V.rotate(V.mulByScalar(negV, 100/1000 + Math.random()*50/1000), angle);
      const pos = V.add(plane.xy, V.mulByScalar(negV, plane.size * 2));
      super(pos, 0.1, v, 3);
      this.layer = 100;
      this.omega = .002 - Math.random()*2*.002;

      this.color = T.fakeTargetStartColor;
      animateOnTimer(T.fakeTargetStartColor, T.fakeTargetEndColor, 100, 5000, TimingFunction.ease(), v => this.color = v, null);
      animateOnTimer([V.length(v)], [0], 100, 5000, TimingFunction.ease(), v => this.v = V.mulByScalar(V.normalize(this.v), v), () => this.dead = true);
    }
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.omega = this.omega;
    pojo.color = this.color;
    return pojo;
  }

  __unserialize(pojo) {
    this.omega = pojo.omega;
    this.color = pojo.color;
  }

  progress(dt) {
    super.progress(dt);
    this.applyRotation(this.omega, dt);
  }

  draw(ctx) {
    super.draw(ctx);

    ctx.strokeStyle = rgb(this.color);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const ray = V.random(this.size);
      ctx.moveTo(this.xy[0], this.xy[1]);
      ctx.lineTo(this.xy[0] + ray[0], this.xy[1] + ray[1]);
      ctx.moveTo(this.xy[0], this.xy[1]);
      ctx.lineTo(this.xy[0] - ray[0], this.xy[1] - ray[1]);
    }
    ctx.stroke();
  }
}

Serialization.registerConstructor(FakeTarget.__type = "FakeTarget", pojo => new FakeTarget(null));

export class Missile extends Trail {
  constructor(xy, target) {
    const minSpeed = 130/1000;
    const maxSpeed = 150/1000;
    super(xy, 0.1, [0, minSpeed + Math.random()*(maxSpeed - minSpeed)], 3);
    this.layer = 100;
    this.maxSpeed = maxSpeed;
    this.minSpeed = minSpeed;
    this.oldTargets = [];
    /**@type {Entity} */
    this.target = target;
    this.maxOmega = 0.002;
    this.lifeTime = 10000 + Math.random()*30000;
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.maxSpeed = this.maxSpeed;
    pojo.minSpeed = this.minSpeed;
    pojo.maxOmega = this.maxOmega;
    pojo.lifeTime = this.lifeTime;
    pojo.target = this.target ? this.target.id : null;
    pojo.oldTargets = this.oldTargets.map(it => it.id);
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this.maxSpeed = pojo.maxSpeed;
    this.minSpeed = pojo.minSpeed;
    this.maxOmega = pojo.maxOmega;
    this.lifeTime = pojo.lifeTime;
  }

  isDying() {
    return this.dead || this.dieAnimation;
  }

  getColideRegion() {
    if (this.dieAnimation) return Region.EMPTY;
    return super.getColideRegion();
  }

  progress(dt) {
    this.lifeTime -= dt;
    if (this.lifeTime <= 0) this.dead = true;

    if (!this.dieAnimation && this.lifeTime < 2000) {
      this._stopTrailing(1500);
      this.dieAnimation = animateOnTimer(T.missileDieStartColor, T.missileDieEndColor, 100, 2000, TimingFunction.linear(0), null, null);
    }

    if (this.target !== undefined) {
      if (this.target.dead) {
        this.target = this.oldTargets.pop();
      }

      if (this.target !== undefined) {
        const targetV = V.subtract(this.target.xy, this.xy);
        const aligned = V.alignUp(targetV, this.v);
        this.applyRotation(this.maxOmega * (aligned[0] > 0 ? 1 : -1), dt);
      }
    }

    super.progress(dt);
  }

  retarget(newTarget) {
    if (this.target === newTarget) return;

    let r;
    let m = this;
    let unwrap = this.target.enhanceDrawWith(function (ctx) {
      ctx.fillStyle = "#ff9999";
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = "#ff9999";

      ctx.beginPath();
      ctx.moveTo(m.xy[0], m.xy[1]);
      ctx.lineTo(m.target.xy[0], m.target.xy[1]);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(newTarget.xy[0], newTarget.xy[1], r()[0], 0, 2*Math.PI);
      ctx.fill();      
    });
    r = animateOnTimer([50], [0], 100, 1000, TimingFunction.ease(), null, unwrap);

    this.oldTargets.push(this.target);
    this.target = newTarget;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    super.draw(ctx);

    const nv = V.normalize(this.v);
    const head = V.add(this.xy, V.mulByScalar(nv, this.size*5/3));
    const left = V.subtract(this.xy, V.mulByScalar(V.normal(nv), this.size*2/3));
    const right = V.add(this.xy, V.mulByScalar(V.normal(nv), this.size*2/3));

    let color = "black";
    if (this.dieAnimation) {
      color = rgb(this.dieAnimation());
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(left[0], left[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.moveTo(right[0], right[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.stroke();

    if (!this.dieAnimation) {
      const a = 1/(this.maxSpeed - this.minSpeed);
      const b = -this.minSpeed*a;
      const p = V.length(this.v)*a + b;
      // color of the jet depends on the missiles velocity (from red to blue)
      ctx.fillStyle = rgb(255 * (1 - p), 0, 255 * p);
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const p = V.add(V.subtract(this.xy, V.mulByScalar(nv, this.size*5/3*i/2)), V.random(1));
        ctx.arc(p[0], p[1], 2/(1+i/2), 0, 2*Math.PI);
        ctx.fill();
      }
    }
  }
}

Serialization.registerConstructor(Missile.__type = "Missile", pojo => {
  let e = new Missile(pojo.xy, undefined);
  if (pojo.target !== null) Serialization.getLink(pojo.target, target => e.target = target, () => undefined);
  else e.target = {xy: [Infinity, Infinity]};
  Serialization.getLink(pojo.oldTargets, oldTargets => e.oldTargets = oldTargets, () => undefined);
  return e;
});

export class Perk extends Entity {
  constructor(xy) {
    super(xy);
    this.layer = 100;
    this.size = 3;
    Timer.set(() => this.dead = true, 60000 + Math.random()*60000);
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.size = this.size;
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this.size = pojo.size;
  }

  /**
   * @returns {Region}
   */
  getColideRegion() {
    return new CircleRegion(this.xy, this.size);
  }

  /**
   * @param {Plane} plane 
   */
  collected(plane) {
    this.dead = true;
  }
}

Serialization.registerConstructor(Perk.__type = "Perk", pojo => new Perk(pojo.xy));

export class Life extends Perk {
  constructor(xy) {
    super(xy);
  }

  draw(ctx) {
    super.draw(ctx);

    ctx.strokeStyle = T.lifeColor;
    ctx.fillStyle = T.lifeColor;
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.fill();
  }

  /**
   * @param {Plane} plane 
   */
  collected(plane) {
    super.collected(plane);
    plane.lifes += 1;
  }
}

Serialization.registerConstructor(Life.__type = "Life", pojo => new Life(pojo.xy));

export class Star extends Perk {
  constructor(xy) {
    super(xy);
  }

  draw(ctx) {
    super.draw(ctx);
    
    ctx.strokeStyle = T.scoreColor;
    ctx.fillStyle = T.scoreColor;
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.fill();
  }

  /**
   * @param {Plane} plane 
   */
  collected(plane) {
    super.collected(plane);
    plane.score += 1;
  }
}

Serialization.registerConstructor(Star.__type = "Star", pojo => new Star(pojo.xy));

export class Explosion extends Fly {
  constructor(xy, N) {
    super(xy, 1, [0, 0], 1);
    this.layer = 100;

    this.deadCount = N;
    this.circles = [];
    let t = 0;
    for (let i = 0; i < N; i++) {
      const dx = 10*this.size - 2*Math.random()*10*this.size;
      const dy = 10*this.size - 2*Math.random()*10*this.size;
      const c = [V.add(xy, [dx, dy]), 0];
      Timer.set(() => {
        animateOnTimer([0], [this.size*20], 10, 1000, TimingFunction.ease(),
          v => {
            c[1] = v;
            this.deadCount--;
          },
          () => this.dead = this.deadCount <= 0
        );
      }, t += Math.random()*100);
      this.circles.push(c);
    }
    this.color = animateOnTimer(T.explosionStartColor, T.explosionEndColor, 100, t + 1000, TimingFunction.linear(0), null, null);

    this.particles = [];
    const maxSpeed = 130/1000;
    for (let i = 0; i < N*10; i++) {
      const v = V.random(maxSpeed + 2*Math.random()*maxSpeed/3);
      this.particles.push([xy, v]);
    }
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.deadCount = this.deadCount;
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
  }

  progress(dt) {
    this.particles.forEach(p => p[0] = V.add(p[0], V.mulByScalar(p[1], dt)));
  }

  getColideRegion() {
    return Region.EMPTY;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    super.draw(ctx);
    
    ctx.globalAlpha = T.explosionAlpha;
    ctx.fillStyle = rgb(this.color());
    this.circles.forEach(c => {
      ctx.beginPath();
      ctx.arc(c[0][0], c[0][1], c[1], 0, 2*Math.PI);
      ctx.fill();
    });
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p[0][0], p[0][1], 2, 0, 2*Math.PI);
      ctx.fill();
    });
  }
}

Serialization.registerConstructor(Explosion.__type = "Explosion", pojo => new Explosion(pojo.xy, pojo.deadCount));

export class Obstacle extends Entity {
  /**
   * @param {Region} region 
   */
  constructor(region) {
    const xy = region.toPolygonRegion().vertices.reduce(
      (acc, value, _, a) => [acc[0] + value[0]/a.length, acc[1] + value[1]/a.length],
      [0, 0]);
    super(xy);
    this.layer = 100;
    this.region = region;
    // this.region.void = true;
    // this.alphaAnim = animateOnTimer([0.0], [1.0], 100, T.planeBirthVoidPeriod, TimingFunction.linear(0), null, () => this.region.void = false);
  }

  getColideRegion() {
    return this.region;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    super.draw(ctx);
    
    // ctx.globalAlpha = this.alphaAnim()[0];
    this.region.draw(ctx, T.obstacleFillColor, T.obstacleStrokeColor);
  }
}

export class Cloud extends Entity {
  constructor(xy) {
    super(xy);
    this.layer = 200;
    this.size = 50;
    this.color = T.cloudColor;
    this.circles = [];
    const N = 4 + Math.round(Math.random()*6);
    for (let i = 0; i < N; i++) {
      const v = V.add(xy, V.random(Math.random()*this.size));
      this.circles.push([v[0], v[1], Math.random()*this.size]);
    }
    this.alphaAnim = animateOnTimer([0.0], [0.1 + Math.random()*0.4], 100, 1000, TimingFunction.linear(0), null, null);
  }

  getColideRegion() {
    return Region.EMPTY;
  }

  draw(ctx) {
    super.draw(ctx);
    
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alphaAnim()[0];
    this.circles.forEach(it => {
      ctx.beginPath();
      ctx.arc(it[0], it[1], it[2], 0, 2*Math.PI);
      ctx.fill();
    });
  }
}

export class Achivement extends Entity {
  constructor(xy, message, color, time) {
    super(xy);
    this.layer = 300;
    this.message = message;
    this.color = color;
    this.fontSize = animateOnTimer([10], [20], 100, time || 1000, TimingFunction.ease(), null, () => this.dead = true);
  }

  getColideRegion() {
    return Region.EMPTY;
  }

  draw(ctx) {
    super.draw(ctx);
    
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = this.color;
    ctx.font = this.fontSize()[0] + "px serif";
    ctx.fillText(this.message, this.xy[0], this.xy[1]);
  }
}
