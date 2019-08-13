var Timer = (function () {
  let id = 0;
  let delayed = [];
  let paused = false;
  let currentTime = 0;

  function set(f, ms) {
    let _id = arguments[2];

    let time = currentTime + ms;
    let i;
    for (i = 0; i < delayed.length; i++) {
      if (delayed[i].time > time) break;
    }

    if (_id === undefined) {
      id++;
      _id = id;
    }

    delayed.splice(i, 0, {
      id: _id,
      time,
      duration: ms,
      f
    });

    return _id;
  }

  function getProgress(timerId) {
    let box = delayed.find(it => it.id === timerId);
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
    let i = delayed.findIndex((it => it.id === timerId));
    if (i !== -1) delayed.splice(i, 1);
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
    for (i = 0; i < delayed.length; i++) {
      if (delayed[i].time > currentTime) break;
    }

    if (i > 0) delayed.splice(0, i).forEach(it => it.f());
  }

  function progress(ms) {
    if (paused) {
      currentTime += ms;
      return;
    }

    currentTime += ms;
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