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
    // notify all consumers about the power off
    this.powerOff();

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
  }
}

class InputOutput extends Thing {
  constructor(id, output, powerNeeded) {
    super(id);
    this._output = null;
    this.output = output;
    this.powerNeeded = powerNeeded;
    this.timers = [];

    /**@type {Set<Thing>} */
    this.waitingThings = new Set();

    /**@type {Set<InputOutput>} */
    this.inputs = new Set();
  }

  set output(o) {
    if (this._output !== null) this._output.removeInput(this);

    if (o !== null) {
      this._output = o;
      o.addInput(this);
    }
  }

  get output() {
    return this._output;
  }

  destroy() {
    this.__resetTimers();

    // remove itself as an input from the output
    this.output = null;

    // remove itself from all inputs
    this.inputs.forEach(input => input.output = null);

    super.destroy();
  }

  __resetTimers() {
    this.timers.forEach(it => Timer.clear(it));
    this.timers = [];
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
    this.__resetTimers();
  }

  _in(thing) {
    throw new Error("_in() Not implemented");
  }

  __waitAndSendToOutput(thing, resolve, output) {
    if (output === undefined) output = this.output;

    this.waitingThings.add(thing);

    let timerId = Timer.set(() => {
      if (output !== null && output._in(thing)) {
        let idx = this.timers.indexOf(timerId);
        assert(idx !== -1);
        this.timers.splice(idx, 1);
    
        this.waitingThings.delete(thing);

        resolve();
      } else this.__waitAndSendToOutput(thing, resolve, output);
    }, 500);

    this.timers.push(timerId);
  }

  _sendToOutput(thing, output) {
    assert(!thing.dead);
    if (output === undefined) output = this.output;

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
    this.inProgress = false;

    this._prepare();
  }

  destroy() {
    this.timeLock.clear();

    super.destroy();
  }

  onPower(powerOn) {
    super.onPower(powerOn);

    if (!powerOn) this.timeLock.clear();
    this._prepare();
  }

  _prepare() {
    if (!this.isPowered()) return;
    if (this.inProgress) return;
    this.inProgress = true;

    let thing = new Thing(this.thingId);
    this.timeLock.add(thing, ThingSource.STATE_MINIG, () => {
      if (this.suply > 0) {
        this.suply--;
        this._sendToOutput(thing).then(() => {
          this.inProgress = false;
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

    if (!powerOn) this.timeLock.clear();
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

    if (!powerOn) this.readyBoxes.clear();
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

    this._outputs = [];
  }

  _routeTo(thing) {
    throw new Error("No implemented");
  }

  _in(thing) {
    let output = this._routeTo(thing);
    if (output === null) return false;
    return this._sendToOutput(thing, output);
  }
}

class ThingIdRouter extends AbstractRouter {
  constructor(powerNeeded) {
    super(powerNeeded);

    /**@type {Map<String, InputOutput>} */
    this.thingIdToOutput = new Map();
  }

  addRoute(thingId, output) {
    this.thingIdToOutput.set(thingId, output);
  }

  removeRoute(thingId) {
    this.thingIdToOutput.delete(thingId);
  }

  removeOutput(output) {
    let thingIds = [];
    for (let pair of this.thingIdToOutput) Keys.push(pair[0]);
    thingIds.forEach(thingId => this.removeRoute(thingId));
  }

  _routeTo(thing) {
    if (this.thingIdToOutput.has(thing.id)) return this.thingIdToOutput.get(thing.id);
    else return null;
  }
}

class ABRouter extends AbstractRouter {
  constructor(powerNeeded) {
    super(powerNeeded);

    /**@type {InputOutput} */
    this.aOutput = null;

    /**@type {InputOutput} */
    this.bOutput = null;

    this._useA = true;
  }

  _routeTo(thing) {
    if (this._useA) return this.aOutput;
    else return this.bOutput;
  }

  setAOutput(output) {
    this.aOutput = output;
  }

  setBOutput(output) {
    this.bOutput = output;
  }

  useA() {
    this._useA = true;
  }

  useB() {
    this._useA = false;
  }

  flip() {
    if (this._useA) this.useB();
    else this.useA();
  }
}