let state = {
  canvas: null,

  /** @type {HexaBoard} */
  board: null,

  /** @type {PowerSource} */
  powerSource: null,

  /**@type {BaseBehaviour} */
  behaviour: null,

  /**@type {Level} */
  level: null,

  pushBehaviour: (newBehaviour) => {
    if (state.behaviour !== null) state.behaviour.onPop();

    newBehaviour.__prevBehaviour = state.behaviour;
    state.behaviour = newBehaviour;

    state.behaviour.onPush();
  },

  popBehaviour(behaviour) {
    assert(state.behaviour === behaviour);

    if (state.behaviour.__prevBehaviour) {
      state.behaviour.onPop();
      state.behaviour = state.behaviour.__prevBehaviour;
      state.behaviour.onPush();
    }
  },

  reset: () => {
    Keys.resetToRoot();
    Loop.clear();
    Timer.clear();
    Loop.setCursor(Cursors.pointer);
    state.board = null;
    state.powerSource = null;
    state.level = null;
    state.pushBehaviour(new MainBehaviour(state));
  },

  setLevel(/**@type {Level}*/ level) {
    Loop.clear();
    Timer.clear();
    Loop.setCursor(Cursors.pointer);
    state.board = null;
    state.powerSource = null;
    
    state.level = level;

    state.board = new HexaBoard(30, 50, state.canvas);
    Loop.add(state.board);

    buildPowerSource(0, 0, level.maxPower);
    level.createWorld();
    state.powerSource.powerOn();
  }
};

Assets.load().then(() => {
  state.reset();
  StateUi(state);
  state.canvas = Loop.start();

  MessageBus.subscribe(SinkSatisfiedMessage, m => {
    state.powerSource.powerOff();
    state.pushBehaviour(new MessageBehaviour(state, "You WIN!", 
      () => state.setLevel(state.level.nextLevel())));
  });

  state.setLevel(new Level1());
});

function createWorld() {
  state.board = new HexaBoard(30, 50, state.canvas);
  Loop.add(state.board);

  buildPowerSource(0, 0, 5000);

  buildThingSource(15, 10, "a", 10, 1000, 10);

  buildSink(6, 4, "Ilya");

  MessageBus.subscribe(SinkSatisfiedMessage, m => {
    state.powerSource.powerOff();
    state.pushBehaviour(new MessageBehaviour(state, "You WIN!", 
      () => state.setLevel(state.level.nextLevel())));
  });
}

function buildPowerSource(x, y, maxPower) {
  let powerSource = new PowerSource(maxPower);
  state.board.add(x, y, powerSource);
  new PowerSourceNode(powerSource);

  state.powerSource = powerSource;

  return powerSource;
}

function connectToPower(thing) {
  if (!state.powerSource.addConsumer(thing)) {
    message("Not enough power", 3000);
    return false;
  }
  return true;
}

function buildFacility(x, y, planString, powerNeeded, name) {
  let plans = planString.split(/\s*\|\s*/).map(str => ConstructionPlan.from(str));
  return __wireThing(x, y, new ConstructionFacility(plans, powerNeeded, name), "factory", FacilityNode);
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  return __wireThing(x, y, new ThingSource(thingId, capacity, msPerThing, powerNeeded), "source", ThingSourceNode);
}

/**
 * @param {InputOutput} producer
 * @param {InputOutput} consumer
 * @param {HexaCell[]} cells
 */
function connect(producer, consumer, cells) {
  if ((!cells || cells.length == 0) && producer === consumer) return null;

  const speed = 0.005;
  const powerPerUnitLength = 1;

  let path;
  if (cells && cells.length > 0) path = cells;
  else path = PathFinder.find(producer.hexaCell, consumer.hexaCell);

  if (path.length == 0) {
    message("No path found", 2000);
    return null;
  }

  if (path.length > 2) {
    let length = path.length - 1;
    let transporter = new Transporter(consumer, length, speed, length * powerPerUnitLength, path);
    if (!connectToPower(transporter)) return null;

    producer.addOutput(transporter);

    path.forEach((it, i) => i > 0 && i < path.length -1 && it.add(transporter));

    new TransporterNode(transporter);

    return transporter;
  } else {
    producer.addOutput(consumer);
    return null;
  }
}

function connectByIdx(producerIdx, consumerIdx, index) {
  index[producerIdx].addOutput(index[consumerIdx]);
}

function buildTransporter(coords) {
  const cells = coords.map(c => state.board.cells[c.x][c.y]);
  assert(cells.length > 0, "No path found");

  const speed = 0.005;
  const powerPerUnitLength = 1;

  const length = cells.length - 1;
  const powerNeeded = length * powerPerUnitLength;
  let transporter = new Transporter(null, length, speed, powerNeeded, cells);
  if (!connectToPower(transporter)) return null;

  cells.forEach((cell, i) => i > 0 && i < cells.length - 1 && cell.add(transporter));

  new TransporterNode(transporter);

  return transporter;
}

function buildSink(x, y, text) {
  return __wireThing(x, y, new Sink(text), "sink", SinkNode);
}

function buildABRouter(x, y) {
  return __wireThing(x, y, new ABRouter(10), "router", ABRouterNode);
}

/**
 * @return {RoundRobinRouter}
 */
function buildRoundRobinRouter(x, y) {
  return __wireThing(x, y, new RoundRobinRouter(10), "router", RoundRobinRouterNode);
}

function buildTrap(cell) {
  const path = new PathBuilder(cell).lu().lu().ru().ru().d().d().build();
  
  if (path.findIndex(cell => cell.things.length > 0) != -1) return;

  const router = buildRoundRobinRouter(cell.x, cell.y);
  connect(router, router, path);
  return router;
}

function buildSeparator(x, y, thingId, powerNeeded) {
  return __wireThing(x, y, new SeparatorRouter(thingId, powerNeeded), "router", SeparatorRouterNode);
}

function buildCountingRouter(x, y, count, powerNeeded) {
  return __wireThing(x, y, new CountingRouter(count, powerNeeded), "router", CountingRouterNode);
}

function buildDelay(x, y, delayMs, powerNeeded) {
  return __wireThing(x, y, new Delay(delayMs, powerNeeded), "delay", DelayNode);
}

function __wireThing(x, y, thing, type, nodeConstructor) {
  if (!connectToPower(thing)) return null;
  state.board.add(x, y, thing, type);
  new nodeConstructor(thing);
  return thing;
}
