const OUTPUT_WAIT_INTERVAL = 200;

class Message {}

const MessageBus = {
  subscribers: new Map(),

  subscribe(constructor, callback) {
    const type = constructor.name;

    let subscribers = MessageBus.subscribers.get(type);
    if (subscribers === undefined) {
      subscribers = [];
      MessageBus.subscribers.set(type, subscribers);
    }
    subscribers.push(callback);
  },

  post(/** @type {Message} */ message) {
    const type = message.constructor.name;

    let callbacks = MessageBus.subscribers.get(type);
    if (callbacks !== undefined)
      setTimeout(() => callbacks.forEach(callback => callback(message)), 0);
  }
};

class Thing {
  constructor(id) {
    this.id = id;
    this.name = null;
    this.dead = false;
    this.size = 1;
    this.__destroyListeners = [];

    /**@type {PowerSource} */
    this.powerSource = null;
    
    /**@type {Set<HexaCell>} */
    this.hexaCells = new Set();
  }

  /**
   * @return {HexaCell}
   */
  get hexaCell() {
    return this.hexaCells.keys().next().value;
  }

  destroy() {
    this.hexaCells.forEach(hexaCell => hexaCell.remove(this));
    if (this.powerSource !== null) this.powerSource.removeConsumer(this);
    this.__destroyListeners.forEach(listener => listener(this));
  }

  onDestroy(listener) {
    this.__destroyListeners.push(listener);
  }

  reset() {}

  isPowered() {
    return this.powerSource !== null && this.powerSource.isOn();
  }

  onPower(powerOn, powerSource) {}

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
    this._on = false;
  }

  get powerLeft() {
    return this.maxPower - this.consumers.reduce((acc, box) => acc + box.power, 0);
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
      o.__addInput(this);
    }
  }

  removeOutput(o) {
    const idx = this._outputs.indexOf(o);
    if (idx === -1) return;
    this._outputs.splice(idx, 1);
    o.__removeInput(this);

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
  __addInput(input) {
    this.inputs.add(input);
  }

  /**
   * @param {InputOutput} input 
   */
  __removeInput(input) {
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

    assert(msPerThing >= 0);
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
   * @param {number} powerNeeded
   * @param {string} name
   */
  constructor(constructionPlans, powerNeeded, name) {
    super("construction-facility", null, powerNeeded);
    this.constructionPlans = constructionPlans;
    this.name = name;

    /**@type {Thing[]} */
    this.thingsBoxed = [];

    this.readyBoxes = new TimeLock();
  }

  reset() {
    super.reset();

    this.thingsBoxed = [];
    this.readyBoxes.clear();
  }

  destroy() {
    this.readyBoxes.clear();

    super.destroy();
  }

  toString() {
    return "Construction facility:"
      + "\n" + this.constructionPlans
      + "\nthingsBoxed: " + this.thingsBoxed.map(it => it.toString())
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

    if (this.readyBoxes.size > 0) return false;

    if (this.waitingThings.size > 0) return false;

    let consumed = false;
    const newThingsBoxed = this.thingsBoxed.concat(thing);
    for (const plan of this.constructionPlans) {
      if (plan.isRequired(newThingsBoxed)) {
        this.thingsBoxed = newThingsBoxed;
        consumed = true;
        break;
      }
    }

    for (const plan of this.constructionPlans) {
      if (plan.isSatifsfies(this.thingsBoxed)) {
        const things = this.thingsBoxed;
        this.thingsBoxed = [];
        this._done(plan, things);
      }
    }

    return consumed;
  }

  /**
   * @param {ConstructionPlan} constructionPlan 
   */
  _done(constructionPlan, things) {
    // produce the results from the box
    this.readyBoxes.add(this, ConstructionFacility.STATE_CONSTRUCTION, () => {
      let promises = [];
      constructionPlan.resultItems.forEach(item => {
        for (let i = 0; i < item.amount; i++) {
          promises.push(this._sendToOutput(new Thing(item.id)));
        }
      });

      Promise.all(promises).then(() => {
        // mark all used things in the box as 'dead'
        things.forEach(it => it.dead = true);
      });
    }, constructionPlan.constructionTimeMs);
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
  /**
   * @param {PlanItem[]} items 
   * @param {PlanItem[]} resultItems 
   * @param {number} constructionTimeMs 
   */
  constructor(items, resultItems, constructionTimeMs) {
    this.items = items;
    this.resultItems = resultItems;
    this.constructionTimeMs = constructionTimeMs;
  }

  /**
   * @param {Thing[]} things 
   */
  isRequired(things) {
    const thingsLeft = things.slice();
    const allIds = [];
    this.items.forEach(it => {
      for (let i = 0; i < it.amount; i++) allIds.push(it.id)
    });
    const withoutStars = allIds.filter(it => it != "*");
    const numberOfStars = allIds.length - withoutStars.length;
    for (const thing of things) {
      const idx = withoutStars.indexOf(thing.id);
      if (idx > -1) {
        withoutStars.splice(idx, 1);
        thingsLeft.splice(thingsLeft.indexOf(thing.id), 1);
      }
    }
    return thingsLeft.length <= numberOfStars;
  }

  /**
   * @param {Thing[]} things 
   */
  isSatifsfies(things) {
    const allIds = [];
    this.items.forEach(it => {
      for (let i = 0; i < it.amount; i++) allIds.push(it.id)
    });
    let thingsLeft = things.length;
    for (const thing of things) {
      const idx = allIds.indexOf(thing.id);
      if (idx > -1) {
        allIds.splice(idx, 1);
        thingsLeft--;
      }
    }
    const nonStartLeft = allIds.filter(it => it !== "*").length;
    return nonStartLeft === 0 && allIds.length === thingsLeft;
  }

  static from(str) {
    // a, 2*c, d -500-> 1*e, f
    const m = str.match(/^([^,]+?(,[^,]+?)*)\s*-((\d+)-)?>\s*([^,]+(,[^,]+)*)$/);
    assert(m !== null);

    const items = ConstructionPlan.__toPlanItems(m[1]);
    const resultItems = ConstructionPlan.__toPlanItems(m[5]);

    let constructionTimeMs = parseInt(m[4]);
    if (isNaN(constructionTimeMs)) constructionTimeMs = 0;

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

class SinkSatisfiedMessage extends Message {
  constructor(/** @type {Sink} */ sink) {
    super();

    this.sink = sink;
  }
}

class Sink extends InputOutput {
  constructor(textToWait) {
    super("sink", null, 0);

    this.textToWait = textToWait;
    this.reset();
  }

  reset() {
    super.reset();

    this.charsSinked = new Map();
    this.textToWait.split("").forEach(ch => {
      if (this.charsSinked.has(ch))
        this.charsSinked.set(ch, this.charsSinked.get(ch) + 1);
      else
        this.charsSinked.set(ch, 1);
    });
    this.satisfied = false;
  }

  _in(thing) {
    const chars = thing.id.split("").filter(ch => this.charsSinked.has(ch));
    if (chars.length == 0) return true;

    for (let ch of chars) {
      if (this.charsSinked.get(ch) > 1) this.charsSinked.set(ch, this.charsSinked.get(ch) - 1);
      else this.charsSinked.delete(ch);
    }

    if (this.charsSinked.size == 0) {
      this.satisfied = true;
      MessageBus.post(new SinkSatisfiedMessage(this));
    }

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

  /**
   * @returns {boolean}
   */
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

class Delay extends InputOutput {
  constructor(delayMs, powerNeeded) {
    super("delay", null, powerNeeded);
    this.delayMs = delayMs;
    this.timerId = null;
  }

  _canAddOutput(o) {
    return this._outputs.length == 0;
  }

  reset() {
    super.reset();

    if (this.timerId !== null) {
      Timer.clear(this.timerId);
      this.timerId = null;
    }
  }

  destroy() {
    this.reset();
    super.destroy();
  }

  onPower(powerOn) {
    super.onPower(powerOn);

    if (this.timerId !== null) {
      if (powerOn) Timer.resume(this.timerId);
      else Timer.pause(this.timerId);
    }
  }

  _in(thing) {
    assert(!thing.dead);

    if (!this.isPowered()) return false;
    if (this.timerId !== null) return false;

    this.timerId = Timer.set(() => {
      this._sendToOutput(thing)
        .then(() => this.timerId = null);
    }, this.delayMs);

    return true;
  }
}