class Thing {
  constructor(id) {
    this.id = id;
    this.dead = false;
  }

  toString() {
    return "Thing: " + JSON.stringify(this);
  }
}

class InputOutput extends Thing {
  constructor(id, output) {
    super(id);
    this.output = output;
  }

  _in(thing) {
    throw new Error("_in() Not implemented");
  }

  _sendToOutput(thing) {
    assert(!thing.dead);
    assert(this.output !== undefined);

    let accepted = this.output._in(thing);
    if (!accepted) this._drop(thing);
  }

  _drop(thing) {
    message("Dropping " + thing.id);
  }
}

class ThingSource extends InputOutput {
  constructor(thingId, capacity, msPerThing) {
    assert(msPerThing > 0);
    assert(capacity > 0);

    super("thing-source", null);
    this.thingId = thingId;
    this.output = null;
    this.suply = capacity;
    this.timeLock = new TimeLock();
    this.msPerThing = msPerThing;

    this._prepare();
  }

  _prepare() {
    let thing = new Thing(this.thingId);
    this.timeLock.add(thing, "preparing", () => {
      if (this.output !== null && this.suply > 0) {
        this.suply--;
        this._sendToOutput(thing);
      }

      this._prepare();
    }, this.msPerThing);
  }
}

class Transporter extends InputOutput {
  constructor(output, length, speed, capacity) {
    super("transporter", output);

    assert(speed > 0);
    assert(capacity > 0);

    this.length = length;
    this.speed = speed;
    this.capacity = capacity;
    this.timeLock = new TimeLock();
  }

  _in(thing) {
    assert(!thing.dead);

    if (this.timeLock.slots.length > this.capacity) return false;

    this.timeLock.add(thing, Transporter.STATE_TRANSPORTED, () => this._sendToOutput(thing), this.length / this.speed);
  }
}

Transporter.STATE_TRANSPORTED = "transported";

class TransportBox extends Thing {
  constructor(transporter, thing) {
    super("transport-box");
    this.transporter = transporter;
    this.thing = thing;
  }
}

class ConstructionFacility extends InputOutput {
  constructor(constructionPlan, capacity, output) {
    super("construction-facility", output);
    this.constructionPlan = constructionPlan;
    this.capacity = capacity;
    this.boxes = []; // TODO should be a priority queue
    this.readyBoxes = new TimeLock();
  }

  toString() {
    return "Construction facility:"
      + "\n" + this.constructionPlan
      + "\ncapacity: " + this.capacity
      + "\nboxes: " + this.boxes.map(it => it.toString())
      + "\nreadyBoxes: " + this.readyBoxes;
  }

  _in(thing) {
    assert(!thing.dead);

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

    // mark all used things in the box as 'dead'
    constructionBox.slots.forEach((l) => l.forEach(it => it.dead = true));

    // remove the box from the facility
    constructionBox.constructionFacility = null;
    this.boxes.splice(this.boxes.indexOf(constructionBox), 1);

    // produce the results from the box
    this.readyBoxes.add(constructionBox, ConstructionFacility.STATE_CONSTRUCTION, () => {
      this.constructionPlan.resultItems.forEach(item => {
        for (let i = 0; i < item.amount; i++) {
          this._sendToOutput(new Thing(item.id));
        }
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
    assert(l.indexOf(thing) === -1, "the box already contains the thing");
    l[idx] = thing;
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