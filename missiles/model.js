class Fly {
  constructor(xy, m, v, size) {
    this.xy = xy;
    this.m = m;
    this.v = v;
    this.size = size;
    this.dead = false;
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

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    throw new Error("Not implemented");
  }

  colideWith(other) {
    return V.length(V.subtract(this.xy, other.xy)) < this.size + other.size;
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

class Missile extends Fly {
  constructor(xy, target) {
    super(xy, 0.1, [0, 130/1000], 3);
    this.target = target;
    this.maxOmega = 0.002;
  }

  progress(dt) {
    const targetV = V.subtract(this.target.xy, this.xy);
    const aligned = V.alignUp(targetV, this.v);
    this.applyRotation(this.maxOmega * (aligned[0] > 0 ? 1 : -1), dt);

    super.progress(dt);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const nv = V.normalize(this.v);
    const head = V.add(this.xy, V.mulByScalar(nv, this.size*5/3));
    const left = V.subtract(this.xy, V.mulByScalar(V.normal(nv), this.size*2/3));
    const right = V.add(this.xy, V.mulByScalar(V.normal(nv), this.size*2/3));

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(left[0], left[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.moveTo(right[0], right[1]);
    ctx.lineTo(head[0], head[1]);
    ctx.stroke();
  }
}

class Star extends Fly {
  constructor(xy) {
    super(xy, 1, [0, 0], 3);
  }

  draw(ctx) {
    ctx.strokeStyle = "green";
    ctx.beginPath();
    ctx.arc(this.xy[0], this.xy[1], this.size, 0, 2*Math.PI);
    ctx.stroke();
  }
}

class Explosion extends Fly {
  constructor(xy) {
    super(xy, 1, [0, 0], 1);
    this.timeLeft = 500;
  }

  colideWith() {
    return false;
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