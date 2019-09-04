const OUTPUT_WAIT_INTERVAL = 200;

class Thing {
  constructor(id) {
    this.id = id;
    this.name = null;
    this.dead = false;
    this.size = 1;

    /**@type {PowerSource} */
    this.powerSource = null;
    
    /** @type {AbstractNode} */
    this.node = null;

    /**@type {Set<HexaCell>} */
    this.hexaCells = new Set();
  }

  get hexaCell() {
    return this.hexaCells.keys().next().value;
  }

  destroy() {
    this.hexaCells.forEach(hexaCell => hexaCell.remove(this));
    this.node.destroy();
    if (this.powerSource !== null) this.powerSource.removeConsumer(this);
  }

  reset() {}

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
    super("power-source");

    this.maxPower = maxPower;
    this.consumers = [];
    this.powerLeft = maxPower;
    this._on = false;
  }

  reset() {
    super.reset();
    this._on = false;
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
    this.outputWaitTimers = [];

    /**@type {Set<Thing>} */
    this.waitingThings = new Set();

    /**@type {Set<InputOutput>} */
    this.inputs = new Set();
  }

  reset() {
    super.reset();

    this.outputWaitTimers.forEach(it => Timer.clear(it));
    this.outputWaitTimers = [];
    this.waitingThings.clear();
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

    this.outputWaitTimers.forEach(it => Timer.clear(it));
    this.outputWaitTimers = [];
    this.waitingThings.clear();
  }

  destroy() {
    this.reset();

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
    if (powerOn) this.outputWaitTimers.forEach(timerId => Timer.resume(timerId));
    else this.outputWaitTimers.forEach(timerId => Timer.pause(timerId));
  }

  _in(thing) {
    throw new Error("_in() Not implemented");
  }

  __waitAndSendToOutput(thing, resolve, output) {
    this.waitingThings.add(thing);

    let timerId = Timer.set(() => {
      let idx = this.outputWaitTimers.indexOf(timerId);
      assert(idx !== -1);
      this.outputWaitTimers.splice(idx, 1);

      if (output === null) output = this._outputs.length > 0 ? this._outputs[0] : null;

      if (output !== null && output._in(thing)) {
        this.waitingThings.delete(thing);

        resolve();
      } else this.__waitAndSendToOutput(thing, resolve, output);
    }, OUTPUT_WAIT_INTERVAL);

    this.outputWaitTimers.push(timerId);
  }

  _sendToOutput(thing, output) {
    assert(!thing.dead);

    if (output === undefined) output = this._outputs.length > 0 ? this._outputs[0] : null;

    return new Promise((resolve) => {
      if (output !== null && output._in(thing)) resolve();
      else this.__waitAndSendToOutput(thing, resolve, output);
    });
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
    this.capacity = capacity;
    this.timeLock = new TimeLock();
    this.msPerThing = msPerThing;

    this._prepare();
  }

  reset() {
    super.reset();

    this.timeLock.clear();
    this.suply = this.capacity;
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

  removeOutput(o) {
    super.removeOutput(o);

    this.timeLock.clear();
  }

  addOutput(o) {
    super.addOutput(o);
    this._prepare();
  }

  refill() {
    this.suply = this.capacity;
    this._prepare();
  }

  _prepare() {
    if (!this.isPowered()) return;
    if (this.suply < 1) return;
    if (this.timeLock.size > 0) return;

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
  constructor(output, length, speed, powerNeeded, cells) {
    super("transporter", output, powerNeeded);

    assert(speed > 0);
    assert(cells.length > 1);

    this.length = length;
    this.speed = speed;
    this.timeLock = new TimeLock();
    this.paused = false;
    this.cells = cells;
  }

  reset() {
    super.reset();

    this.paused = false;
    this.timeLock.clear();
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

    this.timeLock.add(thing, Transporter.STATE_TRANSPORTED,
      () => {
        this.paused = true;
        this.timeLock.pause();
        this._sendToOutput(thing).then(() => {
          this.paused = false;
          this.timeLock.resume();
        });
      },
      this.length / this.speed);

    return true;
  }
}

Transporter.STATE_TRANSPORTED = "transported";

class ConstructionFacility extends InputOutput {
  /**
   * @param {ConstructionPlan[]} constructionPlans
   * @param {number} capacity
   * @param {number} powerNeeded
   */
  constructor(constructionPlans, capacity, powerNeeded) {
    super("construction-facility", null, powerNeeded);
    this.constructionPlans = constructionPlans;
    this.capacity = capacity;

    /** @type {ConstructionBox[]} */
    this.boxes = [];

    this.readyBoxes = new TimeLock();
  }

  reset() {
    super.reset();

    this.boxes = [];
    this.readyBoxes.clear();
  }

  destroy() {
    this.readyBoxes.clear();

    super.destroy();
  }

  toString() {
    return "Construction facility:"
      + "\n" + this.constructionPlans
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

    if (this.readyBoxes.size >= this.capacity) return false;

    if (this.waitingThings.size >= this.capacity) return false;

    let readyPlans = this.constructionPlans.filter(plan => plan.isRequired(thing));
    if (readyPlans.length == 0) return false;

    let box = new ConstructionBox(this, readyPlans[0]);
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
      constructionBox.constructionPlans.resultItems.forEach(item => {
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
    }, constructionBox.constructionPlans.constructionTimeMs);
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

    return this.items.find(it => it.id == thing.id) !== undefined
      || this.items.find(it => it.id == "*") !== undefined;
  }

  static from(str) {
    // a, 2*c, d -500-> 1*e, f
    const m = str.match(/^([^,]+?(,[^,]+?)*)\s*-((\d+)-)?>\s*([^,]+(,[^,]+)*)$/);
    assert(m !== null);

    const items = ConstructionPlan.__toPlanItems(m[1]);
    const resultItems = ConstructionPlan.__toPlanItems(m[5]);

    let constructionTimeMs = parseInt(m[4]);
    if (isNaN(constructionTimeMs)) constructionTimeMs = 500;

    return new ConstructionPlan(items, resultItems, constructionTimeMs);
  }

  static __toPlanItems(str) {
    return str.split(/\s*,\s*/)
      .map(s => [s, s.match(/^(\d+)\*(.+)$/)])
      .map(pair => pair[1] ? new PlanItem(pair[1][2].trim(), parseInt(pair[1][1])) : new PlanItem(pair[0].trim(), 1))
  }

  asString() {
    return this.items.map(it => (it.amount > 1 ? it.amount + "*" : "") + it.id).join(",")
      + " -" + this.constructionTimeMs + "-> "
      + this.resultItems.map(it => (it.amount > 1 ? it.amount + "*" : "") + it.id).join(",");
  }

  toString() {
    return this.items.map(it => (it.amount > 1 ? it.amount + "*" : "") + it.id)
      + " -> "
      + this.resultItems.map(it => (it.amount > 1 ? it.amount + "*" : "") + it.id);
  }
}

class ConstructionBox extends Thing {
  /**
   * @param {ConstructionFacility} constructionFacility
   * @param {ConstructionPlan} constructionPlan
   */
  constructor (constructionFacility, constructionPlan) {
    super("constructor-box");

    this.constructionFacility = constructionFacility;
    this.constructionPlans = constructionPlan;
    this.waitingForCount = 0;

    let slots = new Map();
    this.constructionPlans.items.forEach(item => {
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

    if (!this.slots.has(thing.id) && !this.slots.has("*")) return -1;

    let l = this.slots.get(thing.id);
    if (l) {
      for (let i = 0; i < l.length; i++) {
        if (l[i] === null) {
          return i;
        }
      }
    }

    // wildcard
    l = this.slots.get("*");
    if (!l) return -1;

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
    if (!this.slots.has(thing.id) && !this.slots.has("*")) throw new Error("Non-expected thing " + thing.id);

    let found = false;

    let l = this.slots.get(thing.id) || [];
    for (let i = 0; i < l.length; i++) {
      if (l[i] === null) {
        l[i] = thing;
        found = true;
        break;
      }
    }
    if (!found) {
      l = this.slots.get("*") || [];
      for (let i = 0; i < l.length; i++) {
        if (l[i] === null) {
          l[i] = thing;
          found = true;
          break;
        }
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

  reset() {
    super.reset();

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
    this.timerId = null;
  }

  reset() {
    super.reset();

    if (this.timerId !== null) Timer.clear(this.timerId);

    this.thingToRoute = null;
    this.timerId = null;
  }

  destroy() {
    this.reset();

    super.destroy();
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
      this.timerId = null;
    } else {
      this.timerId = Timer.set(() => this.__tryToRoute(), OUTPUT_WAIT_INTERVAL);
    }
  }
}

class RoundRobinRouter extends AbstractRouter {
  constructor(powerNeeded) {
    super(powerNeeded);
    this._idx = 0;
  }

  reset() {
    super.reset();

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

  reset() {
    super.reset();

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

class CountingRouter extends AbstractRouter {
  constructor(count, powerNeeded) {
    super(powerNeeded);

    this.counter = count;
    this.count = count;
  }

  reset() {
    super.reset();

    this.counter = this.count;
  }

  _canAddOutput() {
    return this._outputs.length < 2;
  }

  _route() {
    if (this._outputs.length === 0) return false;

    if (this.counter > 0) {
      let routed = this._outputs[0]._in(this.thingToRoute);
      if (routed) this.counter--;
      return routed;
    }

    if (this._outputs.length > 1) return this._outputs[1]._in(this.thingToRoute);
    return false;
  }
}
