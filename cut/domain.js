function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

class Board {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.cells = [];
    this.filledCount = 0;
    for (let i = 0; i < w*h; i++) this.cells.push(0);
  }

  static fromPojo(pojo) {
    const b = new Board(pojo.w, pojo.h);
    b.cells = pojo.cells;
    b.filledCount = pojo.filledCount;
    return b;
  }

  toPojo() {
    return {
      w: this.w,
      h: this.h,
      cells: this.cells,
      filledCount: this.filledCount
    };
  }

  get(x, y) {
    assert(x >= 0 && x < this.w);
    assert(y >= 0 && y < this.h);

    return this.cells[x + y * this.w];
  }

  set(x, y, value) {
    assert(x >= 0 && x < this.w);
    assert(y >= 0 && y < this.h);

    if (value == 0 && this.cells[x + y * this.w] != 0) this.filledCount--;
    else if (value != 0 && this.cells[x + y * this.w] == 0) this.filledCount++;
    this.cells[x + y * this.w] = value;
  }

  invert() {
    for (let i = 0; i < this.w * this.h; i++) this.cells[i] = (this.cells[i] == 0 ? 1 : 0);
    return this;
  }

  clone() {
    let b = new Board(this.w, this.h);
    b.cells = this.cells.slice();
    b.filledCount = this.filledCount;
    return b;
  }

  filled() {
    return this.filledCount == this.w * this.h;
  }

  placeFigure(/**@type {Figure} */ figure, x, y, idx) {
    this.set(x, y, idx);
    figure.vectors.forEach(v => this.set(x + v.x, y + v.y, idx));
  }

  figureFit(/**@type {Figure} */ figure, x, y) {
    if (this.get(x, y) === 0) {
      for (let v of figure.vectors) {
        let xx = x + v.x;
        let yy = y + v.y;
        if (xx < 0 || xx >= this.w || yy < 0 || yy >= this.h) return false;
        if (this.get(xx, yy) !== 0) return false;
      }
      return true;
    }
  }

  toString() {
    let s = "";
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        s += this.get(x, y);
        if (x < this.w - 1) s += " ";
      }
      s+= "\n";
    }
    return s;
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toPojo() {
    return {x: this.x, y: this.y};
  }

  static fromPojo(pojo) {
    return new Vector(pojo.x, pojo.y);
  }

  toString() {
    return "(" + this.x + ", " + this.y + ")";
  }
}

class Figure {
  constructor(/**@type {Vector[]} */ vectors) {
    let normalized = vectors.slice();
    normalized.push(new Vector(0, 0));

    let minx = Math.min.apply(null, normalized.map(v => v.x));
    let miny = Math.min.apply(null, normalized.filter(v => v.x == minx).map(v => v.y));

    const dx = -minx;
    const dy = -miny;
    normalized = normalized
      .map(v => new Vector(v.x + dx, v.y + dy))
      .filter(v => v.x !== 0 || v.y !== 0);

    normalized.sort((a, b) => {
      if (a.x < b.x) return -1;
      if (a.x > b.x) return 1;
      if (a.y < b.y) return -1;
      if (a.y > b.y) return 1;
      return 0;
    });

    // assert(normalized.length == vectors.length);

    this.vectors = normalized;
  }

  toPojo() {
    return {
      vectors: this.vectors.map(v => v.toPojo())
    };
  }

  static fromPojo(pojo) {
    return new Figure(pojo.vectors.map(o => Vector.fromPojo(o)));
  }

  rotateClockwise() {
    return new Figure(this.vectors.map(v => new Vector(-v.y, v.x)));
  }

  mirror() {
    return new Figure(this.vectors.map(v => new Vector(-v.x, v.y)));
  }

  id() {
    return this.vectors.map(v => "(" + v.x + "," + v.y + ")").join("");
  }

  toBoard() {
    let minX = 0, maxX = 0, minY = 0, maxY = 0;

    for (let v of this.vectors) {
      if (v.x < minX) minX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }

    let w = maxX - minX + 1;
    let h = maxY - minY + 1;

    let b = new Board(w, h);
    b.placeFigure(this, minX < 0 ? -minX : 0, minY < 0 ? -minY : 0, "1");
    return b;
  }

  toString() {
    // console.log(this);
    return this.toBoard().toString();
  }
}
