var Timer = (function () {
  let id = 0;
  let delayed = [];
  let paused = false;
  let timerId = null;

  function set(f, ms) {
    let _id = arguments[2];

    let time = new Date().getTime() + ms;
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
      f
    });

    // if the first even has been pushed back by the new one
    // then restart the timer
    if (i === 0) {
      clearTimer();
      assureTimer();
    }

    return _id;
  }

  function periodic(f, ms) {
    let _id = arguments[2];

    let id = set(() => {
      f();
      periodic(f, ms, id);
    }, ms, _id);
  }

  function clear(timerId) {
    let i = delayed.findIndex((it => it.id === timerId));
    if (i !== -1) {
      delayed.splice(i, 1);
      if (i === 0) {
        clearTimer();
        assureTimer();
      }
    }
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
    assureTimer();
  }

  function clearTimer() {
    if (timerId === null) return;

    window.clearTimeout(timerId);
    timerId = null;
  }

  function assureTimer() {
    if (paused) return;

    if (timerId === null && delayed.length > 0) {
      let ms = delayed[0].time - new Date().getTime();
      if (ms < 0) ms = 0;
      timerId = window.setTimeout(() => {
        runIfAny();
        timerId = null;
        assureTimer();
      }, ms);
    }
  }

  function runIfAny() {
    if (paused) return;

    let now = new Date().getTime();

    let i;
    for (i = 0; i < delayed.length; i++) {
      if (delayed[i].time > now) break;
    }

    if (i > 0) delayed.splice(0, i).forEach(it => it.f());
  }

  return {
    set,
    periodic,
    clear,
    pause,
    resume,
    paused: () => paused
  };
})();