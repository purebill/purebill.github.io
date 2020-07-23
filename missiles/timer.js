var Timer = (function () {
  let id = 0;
  const inOrder = [];
  const timers = new Map();
  let allPaused = false;
  let currentTime = 0;

  let inbetwean = false;

  function set(f, ms) {
    let _id = arguments[2];

    let time = currentTime + ms;

    if (_id === undefined) {
      id++;
      _id = id;
    }

    let timer = {
      id: _id,
      time,
      duration: ms,
      f,
      paused: false,
      progressBeforePause: 0
    };

    insertInOrder(timer);

    return _id;
  }

  function insertInOrder(timer) {
    let i;
    for (i = 0; i < inOrder.length; i++) {
      if (inOrder[i].time > timer.time) break;
    }

    timers.set(timer.id, timer);
    inOrder.splice(i, 0, timer);
  }

  function getProgress(timerId) {
    const timer = timers.get(timerId);
    if (timer === undefined) return 0;

    if (timer.paused) return timer.progressBeforePause;

    return timer.duration === 0 ? 0 : 1 - (timer.time - currentTime) / timer.duration;
  }

  function periodic(f, ms) {
    let _id = arguments[2];

    let id = set(() => {
      f();
      periodic(f, ms, id);
    }, ms, _id);

    return id;
  }

  function clear(timerId) {
    let i = inOrder.findIndex((it => it.id === timerId));
    if (i !== -1) {
      inOrder.splice(i, 1);
      timers.delete(timerId);
    }
  }

  function clearAll() {
    timers.clear();
    inOrder.splice(0, inOrder.length);
    allPaused = false;
  }

  function pause(timerId) {
    let timer = timers.get(timerId);
    if (timer === undefined) return;
    if (timer.paused) return;

    timer.progressBeforePause = getProgress(timerId);
    timer.paused = true;

    let i = inOrder.findIndex(it => it.id === timerId);
    assert (i !== -1);
    inOrder.splice(i, 1);
  }

  function pauseAll() {
    for (let [id, timer] of timers) {
      pause(id);
    }
    allPaused = true;
  }

  function resume(timerId) {
    let timer = timers.get(timerId);
    if (timer === undefined) return;
    if (!timer.paused) return;

    timer.time = currentTime + (1 - timer.progressBeforePause) * timer.duration;

    timer.paused = false;
    timer.progressBeforePause = 0;

    insertInOrder(timer);
  }

  function resumeAll() {
    for (let [id, timer] of timers) {
      resume(id);
    }
    allPaused = false;
  }

  function runIfAny() {
    if (allPaused) return;

    let i;
    for (i = 0; i < inOrder.length; i++) {
      if (inOrder[i].time > currentTime) break;
    }

    if (i > 0) inOrder.splice(0, i).forEach(it => it.f());
  }

  function progress(ms) {
    currentTime += ms;

    if (allPaused) return;

    inbetwean = true;
    try {
      runIfAny();
    } finally {
      inbetwean = false;
    }
  }

  function wrap(f) {
    return function () {
      if (inbetwean) {
        setTimeout(() => f.apply(null, arguments), 0);
        return;
      }
      return f.apply(null, arguments);
    }
  }

  return {
    set,
    periodic,
    clear: wrap(clear),
    clearAll: wrap(clearAll),
    pause: wrap(pause),
    pauseAll: wrap(pauseAll),
    resume: wrap(resume),
    resumeAll: wrap(resumeAll),
    allPaused: () => allPaused,
    getProgress,
    progress,
    now: () => currentTime
  };
})();

export default Timer;