class Region {
  constructor() {
    this.poly = null;
  }

  /**
   * @returns {ConvexPolygonRegion}
   */
  toPolygonRegion() {
    if (this.poly === null) this.poly = this.__toPolygonRegion();
    return this.poly;
  }

  /**
   * @returns {ConvexPolygonRegion}
   */
  __toPolygonRegion() {
    throw new Error("Can't convert " + this + " to polygon");
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.strokeStyle = "#999999";
    ctx.fillStyle = "#cccccc";

    const poly = this.toPolygonRegion();

    ctx.beginPath();
    ctx.moveTo(poly.vertices[0][0], poly.vertices[0][1]);
    for (let i = 1; i <= poly.vertices.length; i++) {
      const idx = i%poly.vertices.length;
      ctx.lineTo(poly.vertices[idx][0], poly.vertices[idx][1]);
    }
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(poly.vertices[0][0], poly.vertices[0][1]);
    for (let i = 1; i <= poly.vertices.length; i++) {
      const idx = i%poly.vertices.length;
      ctx.lineTo(poly.vertices[idx][0], poly.vertices[idx][1]);
    }
    ctx.stroke();
  }
}

class CircleRegion extends Region {
  constructor(xy, r) {
    super();
    this.xy = xy;
    this.r = r;
  }

  /**
   * @returns {ConvexPolygonRegion}
   */
  __toPolygonRegion() {
    const vertices = [];
    const edgeLength = 5;
    const N = Math.max(5, Math.min(30, Math.round(2*Math.PI*this.r / edgeLength)));
    for (let i = 0; i < N; i++) {
      const x = this.xy[0] + this.r * Math.cos(2*Math.PI / N * i);
      const y = this.xy[1] + this.r * Math.sin(2*Math.PI / N * i);
      vertices.push([x, y]);
    }

    return new ConvexPolygonRegion(vertices);
  }
}

class Semispace {
  constructor(xy0, v, includeXy) {
    this.v0 = xy0;
    this.v = v;
    this.direction = this._direction(includeXy);
  }

  containsPoint(xy) {
    return this.direction*this._direction(xy) >= 0;
  }

  _direction(xy) {
    /* xy = v0 + t*v
       
       x = v0[0] + t*v[0]
       y = v0[1] + t*v[1]

       t = (x - v0[0]) / v[0]
       y = v0[1] + (x - v0[0]) / v[0] * v[1]
    */
    if (Math.abs(this.v[0]) < 1e-6) return Math.sign(xy[0] - this.v0[0]);

    const y = this.v0[1] + (xy[0] - this.v0[0]) / this.v[0] * this.v[1];
    return Math.sign(xy[1] - y);
  }
}

class ConvexPolygonRegion extends Region {
  constructor(vertices) {
    super();
    this.vertices = vertices;
    
    this.semispaces = [];
    for (let i = 0; i < vertices.length; i++) {
      const v0 = vertices[i];
      const v = V.subtract(vertices[(i+1)%vertices.length], vertices[i]);
      const includeXy = vertices[(i+2)%vertices.length];
      this.semispaces.push(new Semispace(v0, v, includeXy));
    }
  }

  containsPoint(xy) {
    for (let semispace of this.semispaces) {
      if (!semispace.containsPoint(xy)) return false;
    }
    return true;
  }

  /**
   * @returns {ConvexPolygonRegion}
   */
  __toPolygonRegion() {
    return this;
  }
}

Region.EMPTY = new Region();

/**
 * @param {Region} left
 * @param {Region} right
 * @returns {boolean}
 */
Region.intersects = function (left, right) {
  if (left === Region.EMPTY || right == Region.EMPTY) return false;

  if (left instanceof CircleRegion && right instanceof CircleRegion) {
    return V.length(V.subtract(left.xy, right.xy)) < left.r + right.r;
  }

  const p1 = left.toPolygonRegion();
  const p2 = right.toPolygonRegion();

  for (const v of p1.vertices) {
    if (p2.containsPoint(v)) return true;
  }
  for (const v of p2.vertices) {
    if (p1.containsPoint(v)) return true;
  }

  return false;
}
