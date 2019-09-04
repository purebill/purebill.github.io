let state = {
  canvas: null,

  /** @type {HexaBoard} */
  board: null,

  powerSource: null,

  /**@type {BaseBehaviour} */
  behaviour: null,

  pushBehaviour: (newBehaviour) => {
    state.behaviour.onPop();
    newBehaviour.__prevBehaviour = state.behaviour;
    state.behaviour = newBehaviour;
    Keys.push();
  },

  popBehaviour() {
    if (state.behaviour.__prevBehaviour) {
      state.behaviour.onPop();
      state.behaviour = state.behaviour.__prevBehaviour;
      Keys.pop();
    }
  },

  reset: () => {
    Keys.resetToRoot();
    Loop.clear();
    Timer.clear();
    state.board = null;
    state.powerSource = null;
    state.behaviour = new BaseBehaviour(state);
  }
};
state.reset();
StateUi(state);
state.canvas = Loop.start();

createWorld();

function createWorld() {
  state.board = new HexaBoard(200, 200, state.canvas);
  Loop.add(state.board);

  buildPowerSource(0, 0, 5000);

  buildThingSource(15, 10, "a", 10, 1000, 10);

  buildSink(6, 4);
}

function buildPowerSource(x, y, maxPower) {
  let powerSource = new PowerSource(maxPower);
  const cell = state.board.add(x, y, powerSource);
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
  let node = new FacilityNode(facility, cell.xc, cell.yc);
  facility.node = node;
  Loop.add(node);
  state.powerSource.addConsumer(facility);
  cell.add(facility);

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  let source = new ThingSource(thingId, capacity, msPerThing, powerNeeded);
  const cell = state.board.add(x, y, source);
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
    message("No path found");
    return null;
  }

  let length = path.length - 1;
  let transporter = new Transporter(consumer, length, speed, length * powerPerUnitLength, path);
  producer.addOutput(transporter);

  path.forEach(it => it.add(transporter));

  let node = new TransporterNode(transporter);
  transporter.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(transporter);

  return transporter;
}

function connectByIdx(producerIdx, consumerIdx, coords, index) {
  const cells = coords.map(c => state.board.cells[c.x][c.y]);
  return connect(index[producerIdx], index[consumerIdx], cells);
}

function buildSink(x, y) {
  const sink = new Sink();
  const cell = state.board.add(x, y, sink);
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