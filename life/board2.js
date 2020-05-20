class Board2 {
  /**
   * @param {number} w
   * @param {number} h
   */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this._buffer = new SparseMatrix();
  }

  get(x, y) {
    return this._buffer.get(x, y);
  }

  set(x, y, v) {
    this._buffer.set(x, y, v);
  }

  clear() {
    this._buffer = new SparseMatrix();
  }

  put(x, y, figure) {
    for (let r = 0; r < figure.length; r++) {
      const a = figure[r];
      for (let c = 0; c < a.length; c++) {
        this.set(x + c, y + r, a[c] ? 1 : 0);
      }
    }
  }  

  random(probability) {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        this.set(x, y, Math.random() < probability ? 1 : 0);
      }
    }
  }

  boundingBox() {
    let left = 1 << 30;
    let top = left;
    let right = -left;
    let bottom = -left;

    this._buffer._map.forEach((line, y) => line.forEach((v, x) => {
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }));

    return {left, top, right, bottom};
  }

  step() {
    const visited = new SparseMatrix();

    const cells = [];
    const f = (x, y) => {
      if (visited.get(x, y) === 0) {
        visited.set(x, y, 1);
        cells.push([x, y]);
      }
    };
    for (let pair of this._buffer._map) {
      const y = pair[0];
      const line = pair[1];
      for (let linePair of line) {
        const x = linePair[0];
        f(x - 1, y - 1);
        f(x    , y - 1);
        f(x + 1, y - 1);
        f(x - 1, y);
        f(x    , y);
        f(x + 1, y);
        f(x - 1, y + 1);
        f(x    , y + 1);
        f(x + 1, y + 1);
      }
    }

    const buffer2 = new SparseMatrix();
    for (let cell of cells) {
      const x = cell[0];
      const y = cell[1];
      const v = this.get(x, y);

      let xm1 = x - 1;
      let xp1 = x + 1;
      let ym1 = y - 1;
      let yp1 = y + 1;

      let sum = 0;
      sum += this.get(xm1, ym1);
      sum += this.get(x,   ym1);
      sum += this.get(xp1, ym1);

      sum += this.get(xm1, y);
      sum += this.get(xp1, y);

      sum += this.get(xm1, yp1);
      sum += this.get(x,   yp1);
      sum += this.get(xp1, yp1);

      if (v == 0 && sum == 3) buffer2.set(x, y, 1);
      else if (v == 1) {
        if (sum >= 2 && sum <= 3) buffer2.set(x, y, 1);
      }
    }
    this._buffer = buffer2;
  }

  toImageData(left, top, w, h, zoom) {
    const ww = w * zoom;
    const hh = h * zoom;
    const imgData = new ImageData(ww, hh);

    for (let pair of this._buffer._map) {
      const y = pair[0];
      if (y < top || y >= top + h) continue;

      const line = pair[1];

      for (let linePair of line) {
        const x = linePair[0];
        if (x < left || x >= left + w) continue;

        const v = linePair[1];
        const color = v == 1 ? 0 : 255;

        for (let yy = 0; yy < zoom; yy++) {
          let i = ((y - top)*zoom + yy) * 4 * ww + (x - left) * zoom * 4;
          for (let xx = 0; xx < zoom; xx++) {
            imgData.data[i++] = color;
            imgData.data[i++] = color;
            imgData.data[i++] = color;
            imgData.data[i++] = 255;//alpha
          }
        }
      }
    }

    return imgData;
  }

  toImageData_old() {
    const imgData = new ImageData(this.w, this.h);
    for (let pair of this._buffer._map) {
      const y = pair[0];
      const line = pair[1];
      for (let linePair of line) {
        const x = linePair[0];
        const v = linePair[1];

        let i = y * 4 * this.w + x * 4;
        const color = v == 1 ? 0 : 255;
        imgData.data[i++] = color;
        imgData.data[i++] = color;
        imgData.data[i++] = color;
        imgData.data[i++] = 255;//alpha
      }
    }
    return imgData;
  }

  __serialize() {
    return {
      w: this.w,
      h: this.h,
      board: this._buffer.__serialize()
    }
  }

  toString() {
    let s = "";
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        s += this.get(x, y);
      }
      s += "\n";
    }
    return s;
  }
}

Board2.__unserialize = (json) => {
  const board = new Board2(json.w, json.h);
  board._buffer = SparseMatrix.__unserialize(json.board);
  return board;
};