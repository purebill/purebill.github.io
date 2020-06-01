class Entity {
  constructor(xy) {
    this.xy = xy;
    this.dead = false;
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
    this.v = v;
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
  }

  progress(dt) {
    super.progress(dt);

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

    if (this.tail.length === 0) return;

    const anim = animate([255], [200], 1, this.tail.length, 0.8);
    for (let i = 1; i < this.tail.length; i++) {
      const c = anim(i);
      ctx.strokeStyle = "rgb(" + c + "," + c + "," + c + ")";
      ctx.beginPath();
      ctx.moveTo(this.tail[i-1][0], this.tail[i-1][1]);
      ctx.lineTo(this.tail[i][0], this.tail[i][1]);
      ctx.stroke();
    }

    const c = anim(this.tail.length);
    ctx.strokeStyle = "rgb(" + c + "," + c + "," + c + ")";
    ctx.beginPath();
    ctx.moveTo(this.xy[0], this.xy[1]);
    ctx.lineTo(this.tail[this.tail.length - 1][0], this.tail[this.tail.length - 1][1]);
    ctx.stroke();
  }
}

class Plane extends Fly {
  constructor(xy) {
    const maxVelocity = 100/1000;
    super(xy, 1, [0, -maxVelocity], 7);

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
}

class Missile extends Trail {
  constructor(xy, target) {
    const minSpeed = 130/1000;
    const maxSpeed = 150/1000;
    super(xy, 0.1, [0, minSpeed + Math.random()*(maxSpeed - minSpeed)], 3);
    this.target = target;
    this.maxOmega = 0.002;
    this.lifeTime = 10000 + 10000 - Math.random()*5000;
  }

  progress(dt) {
    this.lifeTime -= dt;
    if (this.lifeTime <= 0) this.dead = true;

    if (!this.animation && this.lifeTime < 2000) {
      this.animation = animateOnTimer([0], [255], 100, 2000, null, null);
    }

    const targetV = V.subtract(this.target.xy, this.xy);
    const aligned = V.alignUp(targetV, this.v);
    this.applyRotation(this.maxOmega * (aligned[0] > 0 ? 1 : -1), dt);

    super.progress(dt);
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
    if (this.animation) {
      const c = this.animation();
      color = "rgb(" + c + "," + c + "," + c + ")";
    }
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(left[0], left[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.moveTo(right[0], right[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.stroke();
  }
}

class Perk extends Entity {
  constructor(xy) {
    super(xy);
    this.xy = xy;
    this.size = 3;
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

class Star extends Perk {
  constructor(xy) {
    super(xy);
  }

  draw(ctx) {
    ctx.strokeStyle = "green";
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
  }

  /**
   * @param {Game} game 
   */
  collected(game) {
    super.collected(game);
    game.score += 1;
  }
}

class Explosion extends Fly {
  constructor(xy) {
    super(xy, 1, [0, 0], 1);
    this.timeLeft = 500;
  }

  getColideRegion() {
    return Region.EMPTY;
  }

  progress(dt) {
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) this.dead = true;
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size*10*(1 - this.timeLeft/500), 0, 2*Math.PI);
    ctx.stroke();
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
    this.region = region;
  }

  getColideRegion() {
    return this.region;
  }

  draw(ctx) {
    this.region.draw(ctx);
  }
}