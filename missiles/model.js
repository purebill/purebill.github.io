class Entity {
  constructor(xy) {
    this.xy = V.clone(xy);
    this.dead = false;
    this.layer = 0;
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
  }

  colideWith(other) {
    return Region.intersects(this.getColideRegion(), other.getColideRegion());
  }
}

class Fly extends Entity {
  constructor(xy, m, v, size) {
    super(xy);
    this.m = m;
    this.v = V.clone(v);
    this.size = size;
    this.dead = false;
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

class Trail extends Fly {
  constructor(xy, m, v, size) {
    super(xy, m, v, size);

    this.tail = [];
    this.lastXy = null;
    this.trailOn = true;
    this.fadingAlpha = null;
  }

  _stopTrailing(periodToFade) {
    this.trailOn = false;
    animateOnTimer([1], [0], periodToFade/10, periodToFade, TimingFunction.linear(0), v => this.fadingAlpha = v, null);
  }

  progress(dt) {
    super.progress(dt);

    if (!this.trailOn) return;

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

    const anim = animate2([255], [200], 1, this.tail.length, TimingFunction.linear(0.8));
    for (let i = 1; i < this.tail.length; i++) {
      const c = anim(i);
      ctx.strokeStyle = "rgb(" + c + "," + c + "," + c + ")";
      ctx.beginPath();
      ctx.moveTo(this.tail[i-1][0], this.tail[i-1][1]);
      ctx.lineTo(this.tail[i][0], this.tail[i][1]);
      ctx.stroke();
    }

    if (this.trailOn) {
      const c = anim(this.tail.length);
      ctx.strokeStyle = "rgb(" + c + "," + c + "," + c + ")";
      ctx.beginPath();
      ctx.moveTo(this.xy[0], this.xy[1]);
      ctx.lineTo(this.tail[this.tail.length - 1][0], this.tail[this.tail.length - 1][1]);
      ctx.stroke();
    }
  }
}

class Plane extends Fly {
  constructor(xy) {
    const maxVelocity = 100/1000;
    super(xy, 1, [0, -maxVelocity], 7);

    this.layer = 100;
    this.omega = null;
    this.hangForce = null;
    this.boostForce = null;
    this.minVelocity = 10/1000;
    this.maxVelocity = maxVelocity;
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

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(tail[0], tail[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.moveTo(this.xy[0], this.xy[1]);
    ctx.lineTo(left[0], left[1]);
    ctx.moveTo(this.xy[0], this.xy[1]);
    ctx.lineTo(right[0], right[1]);
    ctx.stroke();

    if (this.boostForce !== null) {
      ctx.fillStyle = "#ff3333";
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const p = V.add(V.subtract(this.xy, V.mulByScalar(nv, 5 + this.size/7*5*i/2)), V.random(1));
        ctx.arc(p[0], p[1], 2/(1+i/2), 0, 2*Math.PI);
        ctx.fill();
      }
    }

    if (this.fakeTargetRadius) {
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#cccccc";
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

class FakeTarget extends Fly {
  constructor(plane) {
    const negV = V.negate(V.normalize(plane.v));
    const dAngle = Math.random()*2*Math.PI/10;
    const angle = dAngle - 2*dAngle;
    const v = V.rotate(V.mulByScalar(negV, 100/1000 + Math.random()*50/1000), angle);
    const pos = V.add(plane.xy, V.mulByScalar(negV, plane.size * 2));
    super(pos, 0.1, v, 3);
    this.layer = 100;
    this.plane = plane;
    this.omega = .002 - Math.random()*2*.002;

    this.color = 0;
    animateOnTimer([0], [200], 100, 5000, TimingFunction.ease(), v => this.color = v, null);
    animateOnTimer([V.length(v)], [0], 100, 5000, TimingFunction.ease(), v => this.v = V.mulByScalar(V.normalize(this.v), v), () => this.dead = true);
  }

  progress(dt) {
    super.progress(dt);
    this.applyRotation(this.omega, dt);
  }

  draw(ctx) {
    super.draw(ctx);

    ctx.strokeStyle = "rgb(255, " + this.color + "," + this.color + ")";
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

class Missile extends Trail {
  constructor(xy, target) {
    const minSpeed = 130/1000;
    const maxSpeed = 150/1000;
    super(xy, 0.1, [0, minSpeed + Math.random()*(maxSpeed - minSpeed)], 3);
    this.layer = 100;
    this.maxSpeed = maxSpeed;
    this.minSpeed = minSpeed;
    this.oldTargets = [];
    this.target = target;
    this.maxOmega = 0.002;
    this.lifeTime = 10000 + Math.random()*30000;
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
      this.dieAnimation = animateOnTimer([0], [255], 100, 2000, TimingFunction.linear(0), null, null);
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
      const c = this.dieAnimation();
      color = "rgb(" + c + "," + c + "," + c + ")";
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
      ctx.fillStyle = "rgb(" + (255 * (1 - p)) + ", 0, " + (255 * p) + ")";
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

class Perk extends Entity {
  constructor(xy) {
    super(xy);
    this.layer = 100;
    this.xy = V.clone(xy);
    this.size = 3;
    Timer.set(() => this.dead = true, 20000 + Math.random()*40000);
  }

  /**
   * @returns {Region}
   */
  getColideRegion() {
    return new CircleRegion(this.xy, this.size);
  }

  collected(game) {
    this.dead = true;
  }
}

class Life extends Perk {
  constructor(xy) {
    super(xy);
  }

  draw(ctx) {
    ctx.strokeStyle = "pink";
    ctx.fillStyle = "pink";
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.fill();
  }

  /**
   * @param {Game} game 
   */
  collected(game) {
    super.collected(game);
    game.incrementLifes(1);
  }
}

class Star extends Perk {
  constructor(xy) {
    super(xy);
  }

  draw(ctx) {
    ctx.strokeStyle = "green";
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.fill();
  }

  /**
   * @param {Game} game 
   */
  collected(game) {
    super.collected(game);
    game.incrementScore(1);
  }
}

class Explosion extends Fly {
  constructor(xy, N) {
    super(xy, 1, [0, 0], 1);
    this.layer = 100;
    this.timeLeft = 500;

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
    this.color = animateOnTimer([255, 0, 0], [255, 200, 200], 100, t + 1000, TimingFunction.linear(0), null, null);

    this.particles = [];
    const maxSpeed = 130/1000;
    for (let i = 0; i < N*10; i++) {
      const v = V.random(maxSpeed + 2*Math.random()*maxSpeed/3);
      this.particles.push([xy, v]);
    }
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
    ctx.globalAlpha = 0.5;
    const c = this.color();
    ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
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

class Obstacle extends Entity {
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
    this.region.void = true;
    this.alphaAnim = animateOnTimer([0.0], [1.0], 100, 4000, TimingFunction.linear(0), null, () => this.region.void = false);
  }

  getColideRegion() {
    return this.region;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    ctx.globalAlpha = this.alphaAnim()[0];
    this.region.draw(ctx);
  }
}

class Cloud extends Entity {
  constructor(xy) {
    super(xy);
    this.layer = 200;
    this.size = 50;
    this.color = "#00ffff";
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
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alphaAnim()[0];
    this.circles.forEach(it => {
      ctx.beginPath();
      ctx.arc(it[0], it[1], it[2], 0, 2*Math.PI);
      ctx.fill();
    });
  }
}

class Achivement extends Entity {
  constructor(xy, message) {
    super(xy);
    this.layer = 300;
    this.message = message;
    this.fontSize = animateOnTimer([10], [20], 100, 1000, TimingFunction.ease(), null, () => this.dead = true);
  }

  getColideRegion() {
    return Region.EMPTY;
  }

  draw(ctx) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#000000";
    ctx.font = this.fontSize()[0] + "px serif";
    ctx.fillText(this.message, this.xy[0], this.xy[1]);
  }
}