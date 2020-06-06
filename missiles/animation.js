/**
 * @param {number[]} v1 start vector
 * @param {number[]} v2 end vector
 * @param {number} t1 start time
 * @param {number} t2 end time
 * @param {() => TimingFunction} timingeFunctionFactory
 * @returns {(currentTime: number) => number[]} getter for the vector being animated
 */
function animate(v1, v2, t1, t2, timingeFunctionFactory) {
  return animate2(v1, v2, t1, t2, timingeFunctionFactory);
}

/**
 * @param {number[]} v1 start vector
 * @param {number[]} v2 end vector
 * @param {number} progressMs interval to change the animated vector
 * @param {number} intervalMs animation interval
 * @param {() => TimingFunction} timingFunctionFactory
 * @param {(value: number[]) => any} progressCallback called when animation progresses
 * @param {(value: number[]) => any} finishCallback called when animation is done
 * @returns {() => number[]} getter for the vector being animated
 */
function animateOnTimer(v1, v2, progressMs, intervalMs, timingFunctionFactory, progressCallback, finishCallback) {
  let a = animate(v1, v2, 0, intervalMs, timingFunctionFactory);
  let t = Timer.now();
  let value = v1;
  let intervalId = null;

  let cancel = () => {
    if (intervalId === null) return;

    try { finishCallback && finishCallback(value); } catch (e) { console.error(e); }

    Timer.clear(intervalId);
    intervalId = null;
  };

  let progress = () => {
    let dt = Timer.now() - t;
    value = a(dt);

    try { progressCallback && progressCallback(value); } catch (e) { console.error(e); }

    if (dt > intervalMs) {
      cancel();
    }
  };

  intervalId = Timer.periodic(progress, progressMs);
  progress();

  let getValue = () => value;
  getValue.cancel = cancel;

  return getValue;
}


class TimingFunction {
  init(from, to) {
    this.from = from;
    this.to = to;
    this._init();
    return this;
  }

  _init() {
    throw new Error("Not implemented");
  }

  /**
   * @param {number} t 
   * @returns number
   */
  progress(t) {
    throw new Error("Not implemented");
  }
}

class LinearTimingFunction extends TimingFunction {
  constructor(shift) {
    super();
    this.shift = shift;
  }

  _init() {
    const t1 = 0;
    const t2 = 1;
    
    this.t1s = t1;
    this.t2s = t2;

    if (this.shift < 0) this.t1s = t1 + (t2 - t1)*-this.shift;
    if (this.shift > 0) this.t2s = t1 + (t2 - t1)*(1-this.shift);

    this.step = (this.to - this.from) / (this.t2s - this.t1s);
  }

  /**
   * @param {number} t 
   * @returns number
   */
  progress(t) {
    if (t <= this.t1s) return this.from;
    if (t >= this.t2s) return this.to;
    return this.from + this.step * (t - this.t1s);
  }
}

class EaseTimingFunction extends TimingFunction {
  _init() {
  }

  progress(t) {
    return this.from + Math.sin(Math.PI/2*t)*(this.to - this.from);
  }
}

TimingFunction.ease = () => () => new EaseTimingFunction();
TimingFunction.linear = (shift) => () => new LinearTimingFunction(shift);

/**
 * @param {number[]} v1 start vector
 * @param {number[]} v2 end vector
 * @param {number} t1 start time
 * @param {number} t2 end time
 * @param {() => TimingFunction} timingFunctionFactory
 * @returns {(t: number) => number[]} getter for the vector being animated
 */
function animate2(v1, v2, t1, t2, timingFunctionFactory) {
  const tfs = v1.map((c, idx) => timingFunctionFactory().init(c, v2[idx]));
  return t => {
    return tfs.map(tf => tf.progress((t - t1)/(t2 - t1)));
  };
}
