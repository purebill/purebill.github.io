class Metric {
  update(value) {
    throw new Error("Unimplemented");
  }

  value() {
    throw new Error("Unimplemented");
  }
}

class Gauge extends Metric {
  v = 0;

  update(value) {
    this.v = value;
  }

  value() {
    return this.v;
  }
}

class Maximum extends Gauge {
  constructor() {
    super();
    this.reset();
  }
  
  update(value) {
    if (value > this.v) this.v = value;
  }

  reset() {
    this.v = -Infinity;
  }
}

class Counter extends Gauge {
  increment() {
    this.update(this.value() + 1);
  }
}

class SlidingMean extends Gauge {
  p;

  /**
   * @param {number|void} p 
   */
  constructor(p) {
    super();
    this.p = p || 0.1;
  }

  update(value) {
    super.update(this.value() * this.p  +  value * (1 - this.p));
  }
}

class Timer extends SlidingMean {
  /**
   * @param {number|void} p 
   */
  constructor(p) {
    super(p);
  }

  start() {
    this._startMs = new Date().getTime();
  }

  stop() {
    this.update(new Date().getTime() - this._startMs);
  }

  measure(f) {
    this.start();
    f();
    this.stop();
  }
}

/**@type {Map<String, Metric>} */
const metrics = new Map();

function metric(name, con) {
  if (metrics.has(name)) throw new Error("Metric with the name '" + name + "' already exists");
  const m = con();
  metrics.set(name, m);
  return m;
}


export default {
  /**
   * @param {string} name 
   * @returns {Gauge}
   */
  gauge: name => metric(name, () => new Gauge()),

  /**
   * @param {string} name 
   * @returns {Counter}
   */
  counter: name => metric(name, () => new Counter()),

  /**
   * @param {string} name 
   * @param {number|void} p
   * @returns {SlidingMean}
   */
  slidingMean: (name, p) => metric(name, () => new SlidingMean(p)),

  /**s
   * @returns {Map<String, number>}
   */
  all: () => {
    let result = new Map();
    metrics.forEach((m, name) => result.set(name, m.value()));
    return result;
  },

  /**
   * @param {string} name 
   * @param {number|void} p
   * @returns {Timer}
   */
  timer: (name, p) => metric(name, () => new Timer(p)),

  /**
   * @param {string} name 
   * @returns {Maximum}
   */
  max: name => metric(name, () => new Maximum())
};