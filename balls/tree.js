const EMPTY_SET = new Set();

export class Tree {
  w;
  h;
  n;
  /**@type {Map<number, Map<number, Set<any>>>} */
  map;

  constructor (r, w, h) {
    this.n = Math.min(Math.ceil(w/r), Math.ceil(h/r));
    this.w = w;
    this.h = h;
    this.map = new Map();
  }

  /**
   * @param {number[]} p object's center coordinates
   * @param {number} r effective radius (size) of the object
   * @param {any} o 
   */
  insert(p, r, o) {
    const cellw = this.w / this.n;
    const cellh = this.h / this.n;

    let i1 = Math.floor((p[0] - r) / cellw);
    let i2 = Math.floor((p[0] + r) / cellw);
    let j1 = Math.floor((p[1] - r) / cellh);
    let j2 = Math.floor((p[1] + r) / cellh);

    o.treeCells = [];

    for (let i = i1, x = i1 * cellw; i <= i2; i++, x += cellw) {
      for (let j = j1, y = j1 * cellh; j <= j2; j++, y += cellh) {
        let jmap = this.map.get(i);
        if (!jmap) {
          jmap = new Map();
          this.map.set(i, jmap);
        }

        let set = jmap.get(j);
        if (!set) {
          set = new Set();
          jmap.set(j, set);
        }

        set.add(o);
        o.treeCells.push([i, j, [x, y, x + cellw, y + cellh]]);
      }
    }
  }

  /**
   * @param {number[]} p object's center coordinates
   * @param {number} r effective radius (size) of the object
   * @returns {Set<any>}
   */
  find(p, r) {
    let i1 = Math.floor((p[0] - r) / this.w * this.n);
    let i2 = Math.floor((p[0] + r) / this.w * this.n);
    let j1 = Math.floor((p[1] - r) / this.h * this.n);
    let j2 = Math.floor((p[1] + r) / this.h * this.n);

    let result = EMPTY_SET;

    for (let i = i1; i <= i2; i++) {
      for (let j = j1; j <= j2; j++) {
        let jmap = this.map.get(i);
        if (!jmap) continue;

        let set = jmap.get(j);
        if (!set) continue;

        if (result === EMPTY_SET) result = new Set();
        set.forEach(o => result.add(o));
      }
    }

    return result;
  }

  /**
   * @param {number[]} p object's center coordinates
   * @param {number} r effective radius (size) of the object
   * @param {any} o 
   */
  remove(p, r, o) {
    let i1 = Math.floor((p[0] - r) / this.w * this.n);
    let i2 = Math.floor((p[0] + r) / this.w * this.n);
    let j1 = Math.floor((p[1] - r) / this.h * this.n);
    let j2 = Math.floor((p[1] + r) / this.h * this.n);

    for (let i = i1; i <= i2; i++) {
      for (let j = j1; j <= j2; j++) {
        let jmap = this.map.get(i);
        if (!jmap) return;

        let set = jmap.get(j);
        if (!set) return;

        set.delete(o);
      }
    }
  }

}