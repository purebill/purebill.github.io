var Timer = (function () {
  let id = 0;
  let inOrder = [];
  let timers = new Map();
  let paused = false;
  let currentTime = 0;

  function set(f, ms) {
    let _id = arguments[2];

    let time = currentTime + ms;
    let i;
    for (i = 0; i < inOrder.length; i++) {
      if (inOrder[i].time > time) break;
    }

    if (_id === undefined) {
      id++;
      _id = id;
    }

    inOrder.splice(i, 0, {
      id: _id,
      time,
      duration: ms,
      f
    });

    return _id;
  }

  function getProgress(timerId) {
    let box = inOrder.find(it => it.id === timerId);
    if (box === undefined) return 0;

    return box.duration === 0 ? 0 : 1 - (box.time - currentTime) / box.duration;
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
    if (i !== -1) inOrder.splice(i, 1);
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
  }

  function runIfAny() {
    if (paused) return;

    let i;
    for (i = 0; i < inOrder.length; i++) {
      if (inOrder[i].time > currentTime) break;
    }

    if (i > 0) inOrder.splice(0, i).forEach(it => it.f());
  }

  function progress(ms) {
    currentTime += ms;

    if (paused) return;

    runIfAny();
  }

  return {
    set,
    periodic,
    clear,
    pause,
    resume,
    paused: () => paused,
    getProgress,
    progress,
    now: () => currentTime
  };
})();