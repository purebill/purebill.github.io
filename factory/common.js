function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

function message(m) {
  console.log(m);
}

class TimeLockBox {
  constructor(thing, state, timerId, duration) {
    this.done = false;
    this.thing = thing;
    this.state = state;
    this.timerId = timerId;
    this.start = new Date().getTime();
    this.duration = duration;
  }

  get progress() {
    if (this.done) return 1.0;

    let now = new Date().getTime();
    let passed = now - this.start;
    return this.duration === 0 ? 0 : passed / this.duration;
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
    }, ms);

    box = new TimeLockBox(thing, state, timerId, ms);

    this.slots.push(box);

    return box;
  }
}
