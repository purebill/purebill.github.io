function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

let messagePromise = null;
function message(m, ms) {
  if (messagePromise === null) {
    let root = document.getElementById("message");
    root.innerHTML = "";
    let div = document.createElement("div");
    div.innerText = m;
    root.appendChild(div);

    root.style.display = "block";
    messagePromise = new Promise(resolve => {
      let timerId = null;
      
      const doResolve = () => {
        root.style.display = "none";
        messagePromise = null;
        resolve();
      };

      if (ms > 0) {
        timerId = setTimeout(doResolve, 5000);
      }
      div.onclick = () => {
        if (timerId !== null) clearTimeout(timerId);
        doResolve();
      };
  });
  } else {
    messagePromise.then(() => message(m));
  }
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

  get size() {
    return this.slots.length;
  }

  add(thing, state, f, ms) {
    let box;

    let timerId = Timer.set(() => {
      this.slots.splice(this.slots.findIndex(it => it.timerId === timerId), 1);
      box.done = true;
      thing.timeLockBox = null;
      f();
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

  pause() {
    this.slots.forEach(box => Timer.pause(box.timerId));
  }

  resume() {
    this.slots.forEach(box => Timer.resume(box.timerId));
  }

  clear() {
    this.slots.forEach(it => this.remove(it));
  }
}
