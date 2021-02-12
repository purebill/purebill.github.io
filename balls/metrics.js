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

class Counter extends Gauge {
  increment() {
    this.update(this.value() + 1);
  }
}

class SlidingMean extends Gauge {
  p;

  constructor(p) {
    super();
    this.p = p || 0.1;
  }

  update(value) {
    super.update(this.value() * this.p  +  value * (1 - this.p));
  }
}

class Timer extends SlidingMean {
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

/**
 * @param {string} name 
 * @returns {SlidingMean}
 */
function slidingMean(name, p) {
  return metric(name, () => new SlidingMean(p));
}

function values() {
  let result = new Map();
  metrics.forEach((m, name) => result.set(name, m.value()));
  return result;
}

/**
 * @param {string} name 
 * @returns {Timer}
 */
function timer(name, p) {
  return metric(name, () => new Timer(p));
}

/**
 * @param {string} name 
 * @returns {Gauge}
 */
function gauge(name) {
  return metric(name, () => new Gauge());
}

/**
 * @param {string} name 
 * @returns {Counter}
 */
function counter(name) {
  return metric(name, () => new Counter());
}

export default {
  gauge,
  counter,
  slidingMean,
  all: values,
  timer
};