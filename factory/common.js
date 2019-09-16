function assert(value, message) {
  if (!value) throw new Error("Assertion failed" + (message ? ": " + message : ""));
}

let messageCalls = [];
function message(m, ms) {
  if (m !== undefined) {
    messageCalls.push({m, ms});
    if (messageCalls.length > 1) return;
  }
  
  if (messageCalls.length === 0) return;

  const params = messageCalls[0];

  let root = document.getElementById("message");
  root.innerHTML = "";
  let div = document.createElement("div");
  div.innerText = params.m;
  root.appendChild(div);

  root.style.display = "block";

  let timerId = null;

  div.onclick = () => {
    if (timerId !== null) clearTimeout(timerId);
    root.style.display = "none";
    messageCalls.shift();
    message();
  };

  if (params.ms > 0) timerId = setTimeout(div.onclick, params.ms);
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
