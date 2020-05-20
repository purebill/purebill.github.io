class SparseMatrix {
  constructor() {
    this._map = new Map();
  }

  get(x, y) {
    const v = this._line(y).get(x);
    return v === undefined ? 0 : v;
  }

  set(x, y, v) {
    if (v === 0) this.delete(x, y);
    else this._line(y).set(x, v);
  }

  delete(x, y) {
    const line = this._line(y);
    line.delete(x);
    if (line.size === 0) this._map.delete(y);
  }

  size() {
    let size = 0;

    for (let pair of this._map) {
      const line = pair[1];
      size += line.size;
    }

    return size;
  }

  __serialize() {
    const triples = [];
    this._map.forEach((line, y) => line.forEach((v, x) => triples.push([x, y, v])));
    return {
      triples
    };
  }

  _line(y) {
    let line = this._map.get(y);
    if (line === undefined) {
      line = new Map();
      this._map.set(y, line);
    }
    return line;
  }
}

SparseMatrix.__unserialize = json => {
  const m = new SparseMatrix();
  json.triples.forEach(triple => m.set(triple[0], triple[1], triple[2]));
  return m;
};