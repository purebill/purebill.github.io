let state = {
  canvas: null,

  /** @type {HexaBoard} */
  board: null,

  /** @type {PowerSource} */
  powerSource: null,

  /**@type {BaseBehaviour} */
  behaviour: null,

  pushBehaviour: (newBehaviour) => {
    if (state.behaviour !== null) state.behaviour.onPop();

    newBehaviour.__prevBehaviour = state.behaviour;
    state.behaviour = newBehaviour;

    state.behaviour.onPush();
  },

  popBehaviour() {
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
    state.board = null;
    state.powerSource = null;
    state.pushBehaviour(new MainBehaviour(state));
  }
};
state.reset();
StateUi(state);
state.canvas = Loop.start();

createWorld();

function createWorld() {
  state.board = new HexaBoard(30, 50, state.canvas);
  Loop.add(state.board);

  buildPowerSource(0, 0, 5000);

  buildThingSource(15, 10, "a", 10, 1000, 10);

  buildSink(6, 4, "Sonya");

  MessageBus.subscribe(SinkSatisfiedMessage, m => {
    state.powerSource.powerOff();
    state.pushBehaviour(new MessageBehaviour(state, "You WIN!"));
  });
}

function buildPowerSource(x, y, maxPower) {
  let powerSource = new PowerSource(maxPower);
  state.board.add(x, y, powerSource);
  let node = new PowerSourceNode(powerSource);
  powerSource.node = node;
  Loop.add(node);

  state.powerSource = powerSource;

  return powerSource;
}

function buildFacility(x, y, planString, capacity, powerNeeded) {
  const cell = state.board.cells[x][y];
  let plans = planString.split(/\s*\|\s*/).map(str => ConstructionPlan.from(str));

  let facility = new ConstructionFacility(plans, capacity, powerNeeded);
  let node = new FacilityNode(facility);
  facility.node = node;
  Loop.add(node);
  state.powerSource.addConsumer(facility);
  cell.add(facility);

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  let source = new ThingSource(thingId, capacity, msPerThing, powerNeeded);
  state.board.add(x, y, source);
  let node = new ThingSourceNode(source);
  source.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(source);

  return source;
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
  else path = PathFinder.find(producer.hexaCells.values().next().value, consumer.hexaCells.values().next().value);

  if (path.length == 0) {
    message("No path found", 2000);
    return null;
  }

  if (path.length > 2) {
    let length = path.length - 1;
    let transporter = new Transporter(consumer, length, speed, length * powerPerUnitLength, path);
    producer.addOutput(transporter);

    path.forEach(it => it.add(transporter));

    let node = new TransporterNode(transporter);
    transporter.node = node;
    Loop.add(node);

    state.powerSource.addConsumer(transporter);

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

  const speed = 0.005;
  const powerPerUnitLength = 1;

  if (cells.length == 0) {
    message("No path found", 2000);
    return null;
  }

  const length = cells.length - 1;
  let transporter = new Transporter(null, length, speed, length * powerPerUnitLength, cells);
  cells.forEach(it => it.add(transporter));

  let node = new TransporterNode(transporter);
  transporter.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(transporter);

  return transporter;
}

function buildSink(x, y, text) {
  const sink = new Sink(text);
  state.board.add(x, y, sink);
  const node = new SinkNode(sink);
  sink.node = node;
  Loop.add(node);

  return sink;
}

function buildABRouter(x, y) {
  const cell = state.board.cells[x][y];
  const router = new ABRouter(10);
  cell.add(router);
  const node = new ABRouterNode(router);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildRoundRobinRouter(x, y) {
  const cell = state.board.cells[x][y];
  const router = new RoundRobinRouter(10);
  cell.add(router);
  const node = new RoundRobinRouterNode(router);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildSeparator(x, y, thingId, powerNeeded) {
  const cell = state.board.cells[x][y];
  const router = new SeparatorRouter(thingId, powerNeeded);
  cell.add(router);
  const node = new SeparatorRouterNode(router);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildCountingRouter(x, y, count, powerNeeded) {
  const cell = state.board.cells[x][y];
  const router = new CountingRouter(count, powerNeeded);
  cell.add(router);
  const node = new CountingRouterNode(router);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildDelay(x, y, delayMs, powerNeeded) {
  const cell = state.board.cells[x][y];
  const delay = new Delay(delayMs, powerNeeded);
  cell.add(delay);
  const node = new DelayNode(delay);
  delay.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(delay);

  return delay;
}
