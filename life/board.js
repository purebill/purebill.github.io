class Board {
  /**
   * @param {number} w
   * @param {number} h
   */
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this._buffer = new Int8Array(w * h);
  }

  get(x, y) {
    return this._buffer[y * this.w + x];
  }

  set(x, y, v) {
    this._buffer[y * this.w + x] = v;
  }

  step() {
    const buffer2 = new Int8Array(this.w * this.h);
    let i = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let xm1 = x > 0 ? x - 1 : this.w - 1;
        let xp1 = x < this.w - 1 ? x + 1 : 0;
        let ym1 = y > 0 ? y - 1: this.h - 1;
        let yp1 = y < this.h - 1 ? y + 1 : 0;

        let v = this.get(x, y);

        let sum = 0;
        sum += this.get(xm1, ym1);
        sum += this.get(x,   ym1);
        sum += this.get(xp1, ym1);

        sum += this.get(xm1, y);
        sum += this.get(xp1, y);

        sum += this.get(xm1, yp1);
        sum += this.get(x,   yp1);
        sum += this.get(xp1, yp1);

        if (v == 0 && sum == 3) buffer2[i] = 1;
        else if (v == 1) {
          if (sum < 2 || sum > 3) buffer2[i] = 0;
          else buffer2[i] = 1;
        }

        i++;
      }
    }
    this._buffer = buffer2;
  }

  __serialize() {
    return {
      w: this.w,
      h: this.h,
      buffer: this._buffer
    };
  }

  toImageData() {
    const imgData = new ImageData(this.w, this.h);
    let i = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        let v = this.get(x, y) > 0 ? 0 : 255;
        if (v == 255) {
          i += 4;
          continue;
        }
        imgData.data[i++] = v;
        imgData.data[i++] = v;
        imgData.data[i++] = v;
        imgData.data[i++] = 255;//alpha
      }
    }
    return imgData;
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

Board.__unserialize = json => {
  const b = new Board(json.w, json.h);
  b._buffer = json.buffer;
  return b;
};