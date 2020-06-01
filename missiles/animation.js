/**
 * @param {number[]} v1 start vector
 * @param {number[]} v2 end vector
 * @param {number} t1 start time
 * @param {number} t2 end time
 * @param {number} shift +/-[0, 1] if positive then shifts from the start, if negative -- from the end
 * @returns {(currentTime: number) => number[]} getter for the vector being animated
 */
function animate(v1, v2, t1, t2, shift) {
  v1 = V.clone(v1);
  v2 = V.clone(v2);
  
  let t1s = t1;
  let t2s = t2;

  if (shift < 0) t1s = t1 + (t2 - t1)*-shift;
  if (shift > 0) t2s = t1 + (t2 - t1)*(1-shift);

  const step = v2.map((c, idx) => (c - v1[idx]) / (t2s - t1s));

  return t => {
    if (t <= t1s) return v1;
    if (t >= t2s) return v2;
    return v1.map((c, idx) => c + step[idx] * (t-t1s));
  };
}

/**
 * @param {number[]} v1 start vector
 * @param {number[]} v2 end vector
 * @param {number} intervalMs interval to change the animated vector
 * @param {number} tillMs animation interval
 * @param {(value: number[]) => any} callback called when animation progresses
 * @param {(value: number[]) => any} cancelCallback called when animation is cancelled
 * @returns {() => number[]} getter for the vector being animated
 */
function animateOnTimer(v1, v2, intervalMs, tillMs, callback, cancelCallback) {
  let a = animate(v1, v2, 0, tillMs, 0);
  let t = new Date().getTime();
  let value = v1;
  let intervalId = null;

  let cancel = () => {
    if (intervalId === null) return;

    try { cancelCallback && cancelCallback(value); } catch (e) { console.error(e); }

    Timer.clear(intervalId);
    intervalId = null;
  };

  let progress = () => {
    let dt = new Date().getTime() - t;
    value = a(dt);

    try { callback && callback(value); } catch (e) { console.error(e); }

    if (dt > tillMs) {
      cancel();
    }
  };

  progress();

  intervalId = Timer.periodic(progress, intervalMs);

  let getValue = () => value;
  getValue.cancel = cancel;

  return getValue;
}