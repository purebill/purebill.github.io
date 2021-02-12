const EMPTY_SET = new Set();

export class Tree {
  w;
  h;
  r;
  n;

  constructor (r, w, h) {
    this.n = Math.min(Math.floor(Math.log2(w) - Math.log2(r)), Math.floor(Math.log2(h) - Math.log2(r)));
    this.r = r;
    this.w = w;
    this.h = h;
    this.root = [null, null, null, null];
  }

  /**
   * @param {number[]} p 
   * @returns {number}
   */
  code(p) {
    let result = 0;
    let x1 = 0, x2 = this.w;
    let y1 = 0, y2 = this.h;
    for (let i = 0; i < this.n; i++) {
      let x = (x1 + x2)/2;
      let y = (y1 + y2)/2;
      let idx = 0;
      if (p[0] > x) idx |= 2;
      if (p[1] > y) idx |= 1;

      if (idx & 2) x1 = x;
      else x2 = x;
      if (idx & 1) y1 = y;
      else y2 = y;

      result <<= 2;
      result |= idx;
    }

    return result;
  }

  /**
   * @param {number[]} p 
   * @param {any} o 
   * @returns {[number, number, number, number]}
   */
  insert(p, o) {
    let node = this.root;
    let x1 = 0, x2 = this.w;
    let y1 = 0, y2 = this.h;
    for (let i = 0; i < this.n; i++) {
      let x = (x1 + x2)/2;
      let y = (y1 + y2)/2;
      let idx = 0;
      if (p[0] > x) idx |= 2;
      if (p[1] > y) idx |= 1;

      if (idx & 2) x1 = x;
      else x2 = x;
      if (idx & 1) y1 = y;
      else y2 = y;

      if (node[idx] === null) node[idx] = i == this.n - 1 ? new Set() : [null, null, null, null];

      node = node[idx];
    }

    node.add(o);

    return [x1, x2, y1, y2];
  }

  /**
   * @param {number[]} p 
   * @returns {Set<any>}
   */
  find(p) {
    let node = this.root;
    let x1 = 0, x2 = this.w;
    let y1 = 0, y2 = this.h;
    for (let i = 0; i < this.n; i++) {
      if (node === null) return EMPTY_SET;

      let x = (x1 + x2)/2;
      let y = (y1 + y2)/2;
      let idx = 0;
      if (p[0] > x) idx |= 2;
      if (p[1] > y) idx |= 1;

      if (idx & 2) x1 = x;
      else x2 = x;
      if (idx & 1) y1 = y;
      else y2 = y;

      node = node[idx];
    }

    return node === null ? EMPTY_SET : node;
  }

  /**
   * @param {number[]} p 
   * @param {any} o 
   */
  remove(p, o) {
    let node = this.find(p);
    node.delete(o);
  }

}