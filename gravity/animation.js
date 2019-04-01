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

function animateOnTimer(v1, v2, intervalMs, tillMs, callback, cancelCallback) {
  let a = animate(v1, v2, 0, tillMs);
  let t = new Date().getTime();
  let value = v1;
  let intervalId = null;

  let cancel = () => {
    if (intervalId === null) return;

    try { cancelCallback && cancelCallback(value); } catch (e) { console.error(e); }

    clearInterval(intervalId);
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

  intervalId = setInterval(progress, intervalMs);

  let getValue = () => value;
  getValue.cancel = cancel;

  return getValue;
}