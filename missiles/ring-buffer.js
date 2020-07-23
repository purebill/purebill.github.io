export class RingBuffer {
  constructor(capacity) {
    this.buffer = new Array(capacity);
    this.startIdx = 0;
    this.endIdx = 0;
    this.size = 0;
  }

  get(i) {
    if (i >= this.size) return undefined;
    return this.buffer[(this.startIdx + i) % this.buffer.length];
  }

  set(i, v) {
    this.buffer[(this.startIdx + i) % this.buffer.length] = v;
  }

  push(...values) {
    for (let v of values) {
      const l = this.buffer.length;
      if (this.size < l) {
        this.buffer[this.endIdx++] = v;
        this.size++;
      } else {
        this.buffer[this.startIdx] = v;
        this.startIdx = (this.startIdx + 1) % l;
      }
    }
  }

  forEach(f) {
    for (let j = 0; j < this.size; j++) f(this.get(j), j);
  }

  toArray() {
    const array = new Array(this.size);
    this.forEach((v, idx) => array[idx] = v);
    return array;
  }
}

export class ConsumedBuffer {
  /**
   * @param {RingBuffer} buffer 
   * @param {number=} startIdx
   */
  constructor(buffer, startIdx) {
    this.buffer = buffer;
    this.idx = startIdx || 0;
  }

  atEnd() {
    return this.idx == this.buffer.size;
  }

  next() {
    if (this.atEnd()) return undefined;
    return this.buffer.get(this.idx++);
  }
}
