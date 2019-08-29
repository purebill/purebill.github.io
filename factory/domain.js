const OUTPUT_WAIT_INTERVAL = 200;

class Thing {
  constructor(id) {
    this.id = id;
    this.dead = false;
    this.size = 1;

    /**@type {PowerSource} */
    this.powerSource = null;
    
    /** @type {AbstractNode} */
    this.node = null;

    /**@type {Set<HexaCell>} */
    this.hexaCells = new Set();
  }

  destroy() {
    this.hexaCells.forEach(hexaCell => hexaCell.remove(this));
    this.node.destroy();
    if (this.powerSource !== null) this.powerSource.removeConsumer(this);
    console.log("[Thing]", this.id, "destroyed");
  }

  isPowered() {
    return this.powerSource !== null && this.powerSource.isOn();
  }

  onPower(powerOn, powerSource) {
    message("[" + this.id + "] Power " + (powerOn ? "ON" : "OFF"));
  }

  toString() {
    return "Thing: " + JSON.stringify(this);
  }
}

class PowerConnection {
  constructor(consumer, power) {
    this.consumer = consumer;
    this.power = power;
  }
}

class PowerSource extends Thing {
  constructor(maxPower) {
    super("power-source")

    this.maxPower = maxPower;
    this.consumers = [];
    this.powerLeft = maxPower;
    this._on = true;
  }

  destroy() {
    // remove all consumer's connection to the source
    this.consumers.forEach(box => this.removeConsumer(box.consumer));

    super.destroy();
  }

  powerOff() {
    this._on = false;
    this._notifyConsumers();
  }

  powerOn() {
    this._on = true;
    this._notifyConsumers();
  }

  _notifyConsumers() {
    this.consumers.forEach(box => box.consumer.onPower(this._on, this));
  }

  isOn() {
    return this._on;
  }

  contains(consumer) {
    return this.consumers.findIndex(it => it.consumer === consumer) !== -1;
  }
  canAddConsumer(consumer) {
    return this.powerLeft >= consumer.powerNeeded && !this.contains(consumer);
  }

  addConsumer(consumer) {
    if (this.canAddConsumer(consumer)) {
      this.consumers.push(new PowerConnection(consumer, consumer.powerNeeded));
      this.powerLeft -= consumer.powerNeeded;
      consumer.powerSource = this;
      consumer.onPower(this._on, this);
      return true;
    }
    return false;
  }

  removeConsumer(consumer) {
    let idx = this.consumers.findIndex(it => it.consumer === consumer);
    assert(idx !== -1);
    let powerConnection = this.consumers.splice(idx, 1)[0];
    consumer.powerSource = null;
    this.powerLeft += powerConnection.power;
    consumer.onPower(false, this);
  }
}

class InputOutput extends Thing {
  constructor(id, output, powerNeeded) {
    super(id);
    this._outputs = [];
    this.addOutput(output);
    this.powerNeeded = powerNeeded;
    this.timers = [];

    /**@type {Set<Thing>} */
    this.waitingThings = new Set();

    /**@type {Set<InputOutput>} */
    this.inputs = new Set();
  }

  _canAddOutput() {
    return this._outputs.length === 0;
  }

  addOutput(o) {
    if (o !== null && this._canAddOutput()) {
      this._outputs.push(o);
      o.addInput(this);
    }
  }

  removeOutput(o) {
    const idx = this._outputs.indexOf(o);
    if (idx === -1) return;
    this._outputs.splice(idx, 1);
    o.removeInput(this);
  }

  set output(o) {
    this.addOutput(o);
  }

  get output() {
    return this._outputs.length > 0 ? this._outputs[0] : null;
  }

  destroy() {
    this.timers.forEach(it => Timer.clear(it));
    this.timers = [];
    this.waitingThings.clear();

    // remove itself as an input from the output
    this._outputs.forEach(it => this.removeOutput(it));

    // remove itself from all inputs
    this.inputs.forEach(input => input.removeOutput(this));

    super.destroy();
  }

  /**
   * @param {InputOutput} input 
   */
  addInput(input) {
    this.inputs.add(input);
  }

  /**
   * @param {InputOutput} input 
   */
  removeInput(input) {
    this.inputs.delete(input);
  }

  onPower(powerOn) {
    if (powerOn) this.timers.forEach(timerId => Timer.resume(timerId));
    else this.timers.forEach(timerId => Timer.pause(timerId));
  }

  _in(thing) {
    throw new Error("_in() Not implemented");
  }

  __waitAndSendToOutput(thing, resolve, output) {
    this.waitingThings.add(thing);

    let timerId = Timer.set(() => {
      let idx = this.timers.indexOf(timerId);
      assert(idx !== -1);
      this.timers.splice(idx, 1);

      if (output === null) output = this._outputs.length > 0 ? this._outputs[0] : null;

      if (output !== null && output._in(thing)) {
        this.waitingThings.delete(thing);

        resolve();
      } else this.__waitAndSendToOutput(thing, resolve, output);
    }, OUTPUT_WAIT_INTERVAL);

    this.timers.push(timerId);
  }

  _sendToOutput(thing, output) {
    assert(!thing.dead);

    if (output === undefined) output = this._outputs.length > 0 ? this._outputs[0] : null;

    return new Promise((resolve) => {
      if (output !== null && output._in(thing)) resolve();
      else this.__waitAndSendToOutput(thing, resolve, output);
    });
  }

  _drop(thing) {
    message("Dropping " + thing.id);
  }
}

class ThingSource extends InputOutput {
  constructor(thingId, capacity, msPerThing, powerNeeded) {
    super("thing-source", null, powerNeeded);

    assert(msPerThing > 0);
    assert(capacity > 0);
    assert(powerNeeded >= 0);

    this.thingId = thingId;
    this.suply = capacity;
    this.timeLock = new TimeLock();
    this.msPerThing = msPerThing;

    this._prepare();
  }

  destroy() {
    this.timeLock.clear();

    super.destroy();
  }

  onPower(powerOn) {
    super.onPower(powerOn);

    if (powerOn) this.timeLock.resume();
    else this.timeLock.pause();

    if (this.timeLock.size === 0) this._prepare();
  }

  _prepare() {
    if (!this.isPowered()) return;

    let thing = new Thing(this.thingId);
    this.timeLock.add(thing, ThingSource.STATE_MINIG, () => {
      if (this.suply > 0) {
        this.suply--;
        this._sendToOutput(thing).then(() => {
          this._prepare();
        });
      }
    }, this.msPerThing);
  }
}

ThingSource.STATE_MINIG = "mining";

class Transporter extends InputOutput {
  constructor(output, length, speed, powerNeeded) {
    super("transporter", output, powerNeeded);

    assert(speed > 0);

    this.length = length;
    this.speed = speed;
    this.thingsInProgress = 0;
    this.timeLock = new TimeLock();
    this.paused = false;
  }

  destroy() {
    this.timeLock.clear();

    super.destroy();
  }

  onPower(powerOn) {
    super.onPower(powerOn);

    if (powerOn) this.timeLock.resume();
    else this.timeLock.pause();
  }

  __canAccept(thing) {
    if (this.paused) return false;
    let minProgress = thing.size / this.length;
    return Math.min.apply(null, this.timeLock.slots.map(slot => slot.progress)) > minProgress;
  }

  _in(thing) {
    assert(!thing.dead);

    if (!this.isPowered()) return false;

    if (!this.__canAccept(thing)) return false;

    this.thingsInProgress++;

    this.timeLock.add(thing, Transporter.STATE_TRANSPORTED,
      () => {
        this.paused = true;
        this._sendToOutput(thing).then(() => this.paused = false);
      },
      this.length / this.speed);

    return true;
  }
}

Transporter.STATE_TRANSPORTED = "transported";

class ConstructionFacility extends InputOutput {
  /**
   * @param {ConstructionPlan} constructionPlan
   * @param {number} capacity
   * @param {number} powerNeeded
   */
  constructor(constructionPlan, capacity, powerNeeded) {
    super("construction-facility", null, powerNeeded);
    this.constructionPlan = constructionPlan;
    this.capacity = capacity;

    /** @type {ConstructionBox[]} */
    this.boxes = [];

    this.readyBoxes = new TimeLock();
  }

  destroy() {
    this.readyBoxes.clear();

    super.destroy();
  }

  toString() {
    return "Construction facility:"
      + "\n" + this.constructionPlan
      + "\ncapacity: " + this.capacity
      + "\nboxes: " + this.boxes.map(it => it.toString())
      + "\nreadyBoxes: " + this.readyBoxes;
  }

  onPower(powerOn) {
    super.onPower(powerOn);

    if (powerOn) this.readyBoxes.resume();
    else this.readyBoxes.pause();
  }

  _in(thing) {
    assert(!thing.dead);

    if (!this.isPowered()) return false;

    for (let box of this.boxes) {
      if (box.isRequired(thing)) {
        box.add(thing);
        return true;
      }
    }

    if (this.boxes.length >= this.capacity) return false;

    if (!this.constructionPlan.isRequired(thing)) return false;

    if (this.readyBoxes.size >= this.capacity) return false;

    if (this.waitingThings.size >= this.capacity) return false;

    let box = new ConstructionBox(this);
    this.boxes.push(box);
    box.add(thing);

    return true;
  }

  _done(constructionBox) {
    assert(constructionBox.constructionFacility === this);
    assert(this.boxes.indexOf(constructionBox) !== -1);

    // produce the results from the box
    this.readyBoxes.add(constructionBox, ConstructionFacility.STATE_CONSTRUCTION, () => {
      let promises = [];
      this.constructionPlan.resultItems.forEach(item => {
        for (let i = 0; i < item.amount; i++) {
          promises.push(this._sendToOutput(new Thing(item.id)));
        }
      });

      Promise.all(promises).then(() => {
        // mark all used things in the box as 'dead'
        constructionBox.slots.forEach((l) => l.forEach(it => it.dead = true));

        // remove the box from the facility
        constructionBox.constructionFacility = null;
        this.boxes.splice(this.boxes.indexOf(constructionBox), 1);
      });
    }, this.constructionPlan.constructionTimeMs);
  }
}

ConstructionFacility.STATE_CONSTRUCTION = "construction";

class PlanItem {
  constructor(id, amount) {
    this.id = id;
    this.amount = amount;
  }
}

class ConstructionPlan {
  constructor(items, resultItems, constructionTimeMs) {
    this.items = items;
    this.resultItems = resultItems;
    this.constructionTimeMs = constructionTimeMs;
  }

  isRequired(thing) {
    assert(!thing.dead);

    return this.items.find(it => it.id == thing.id) !== undefined;
  }

  static from(str) {
    // a, 2*c, d -500-> 1*e, f
    const m = str.match(/^(([^,]+(,[^,]+)*))\s+-(\d+)->\s+(([^,]+(,[^,]+)*))$/);
    assert(m !== null);

    const items = ConstructionPlan.__toPlanItems(m[1]);
    const resultItems = ConstructionPlan.__toPlanItems(m[5]);

    return new ConstructionPlan(items, resultItems, parseInt(m[4]));
  }

  static __toPlanItems(str) {
    return str.split(/\s*,\s*/)
      .map(s => [s, s.match(/^(\d+)\*(.+)$/)])
      .map(pair => pair[1] ? new PlanItem(pair[1][2], parseInt(pair[1][1])) : new PlanItem(pair[0], 1))
  }

  toString() {
    return "Construction plan: " + JSON.stringify(this);
  }
}

class ConstructionBox extends Thing {
  /**
   * @param {ConstructionFacility} constructionFacility
   */
  constructor (constructionFacility) {
    super("constructor-box");

    this.constructionFacility = constructionFacility;
    this.waitingForCount = 0;

    let slots = new Map();
    this.constructionFacility.constructionPlan.items.forEach(item => {
      if (!slots.has(item.id)) slots.set(item.id, []);
      for (let i = 0; i < item.amount; i++) slots.get(item.id).push(null);
      this.waitingForCount += item.amount;
    });
    this.slots = slots;
  }

  toString() {
    let s = "Construction box: ";
    for (let pair of this.slots) s += "\n" + pair[0] + ": " + pair[1];
    return s;
  }

  _findSlotFor(thing) {
    assert(!thing.dead);

    if (!this.slots.has(thing.id)) return -1;

    let l = this.slots.get(thing.id);
    for (let i = 0; i < l.length; i++) {
      if (l[i] === null) {
        return i;
      }
    }

    return -1;
  }

  isRequired(thing) {
    return this._findSlotFor(thing) !== -1;
  }

  add(thing) {
    assert(!thing.dead);

    let idx = this._findSlotFor(thing);

    if (idx === -1) throw new Error("No space for the thing or it is not expected: " + thing.id);
    if (!this.slots.has(thing.id)) throw new Error("Non-expected thing " + thing.id);

    let l = this.slots.get(thing.id);

    let found = false;
    for (let i = 0; i < l.length; i++) {
      if (l[i] === null) {
        l[i] = thing;
        found = true;
        break;
      }
    }
    assert(found, "No free space for the thing");
    this.waitingForCount--;

    if (this.isSatisfied()) this.constructionFacility._done(this);
  }

  thingsLeft() {
    return this.waitingForCount;
  }

  isSatisfied() {
    return this.waitingForCount === 0;
  }
}

class Sink extends InputOutput {
  constructor() {
    super("sink", null, 0);

    this.thingsSinked = 0;
  }

  _in(thing) {
    this.thingsSinked++;
    return true;
  }
}

class AbstractRouter extends InputOutput {
  constructor(powerNeeded) {
    super("router", null, powerNeeded);

    this.thingToRoute = null;
  }

  _route() {
    throw new Error("Not implemented");
  }

  _in(thing) {
    if (this.thingToRoute !== null) return false;
    this.thingToRoute = thing;
    this.__tryToRoute();
    return true;
  }

  __tryToRoute() {
    if (this._route()) {
      this.thingToRoute = null;
    } else {
      Timer.set(() => this.__tryToRoute(), OUTPUT_WAIT_INTERVAL);
    }
  }
}

class RoundRobinRouter extends AbstractRouter {
  constructor(powerNeeded) {
    super(powerNeeded);
    this._idx = 0;
  }

  _canAddOutput() {
    return true;
  }

  _route() {
    for (let i = 0; i < this._outputs.length; i++) {
      const idx = this._idx % this._outputs.length;
      this._idx = (this._idx + 1) % this._outputs.length;

      if (this._outputs[idx]._in(this.thingToRoute)) return true;
    }

    return false;
  }
}

class ABRouter extends AbstractRouter {
  constructor(powerNeeded) {
    super(powerNeeded);

    this._idx = -1;
  }

  _canAddOutput() {
    return this._outputs.length < 2;
  }

  _route() {
    if (this._idx === -1 || this._outputs.length <= this._idx) return false;

    return this._outputs[this._idx]._in(this.thingToRoute);
  }

  useA() {
    this._idx = 0;
  }

  useB() {
    this._idx = 1;
  }

  flip() {
    this._idx = (this._idx + 1) % 2;
  }
}

class SeparatorRouter extends AbstractRouter {
  constructor(thingId, powerNeeded) {
    super(powerNeeded);

    this.thingId = thingId;
  }

  _canAddOutput() {
    return this._outputs.length < 2;
  }

  _route() {
    if (this._outputs.length === 0) return false;
    if (this.thingToRoute.id === this.thingId) return this._outputs[0]._in(this.thingToRoute);
    if (this._outputs.length < 2) return false;
    return this._outputs[1]._in(this.thingToRoute);
  }
}