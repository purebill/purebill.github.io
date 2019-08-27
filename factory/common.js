function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

function message(m) {
  console.log(m);
}

class TimeLockBox {
  constructor(thing, state, timerId) {
    this.done = false;
    this.thing = thing;
    this.state = state;
    this.timerId = timerId;
  }

  get progress() {
    if (this.done) return 1.0;

    return Timer.getProgress(this.timerId);
  }
}

class TimeLock {
  constructor() {
    this.slots = [];
  }

  toString() {
    return "Time lock: " + this.slots.map(it => JSON.stringify(it));
  }

  add(thing, state, f, ms) {
    let box;

    let timerId = Timer.set(() => {
      f();
      this.slots.splice(this.slots.findIndex(it => it.timerId === timerId), 1);
      box.done = true;
      thing.timeLockBox = null;
    }, ms);

    box = new TimeLockBox(thing, state, timerId);
    thing.timeLockBox = box;

    this.slots.push(box);

    return box;
  }

  remove(box) {
    let idx = this.slots.findIndex(it => it.timerId === box.timerId);
    if (idx === -1) return;

    Timer.clear(box.timerId);
    this.slots.splice(idx, 1);
    box.thing.timeLockBox = null;
  }

  clear() {
    this.slots.forEach(it => this.remove(it));
  }
}
