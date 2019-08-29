let state = {
  state: null,

  /** @type {HexaBoard} */
  board: null,

  powerSource: null,

  contextMenu: new ContextMenu(),

  behaviour: null,

  pushBehaviour: (newBehaviour) => {
    newBehaviour.__prevBehaviour = state.behaviour;
    state.behaviour = newBehaviour;
  },

  popBehaviour() {
    if (state.behaviour.__prevBehaviour) {
      state.behaviour = state.behaviour.__prevBehaviour;
    }
  },

  reset: () => {
    state.behaviour = new BaseBehaviour(state);
    state.contextMenu.hide();
    board.clearSelection();
  }
};
state.behaviour = new BaseBehaviour(state);
StateUi(state);

/** @type {HexaBoard} */
let board;

createWorld();

Loop.start();

function createWorld() {
  board = new HexaBoard(20, 25);
  Loop.add(board);

  let powerSource = buildPowerSource(0, 0, 100);
  powerSource.powerOff();
  state.powerSource = powerSource;

  // buildThingSource(0, 0, "plastic", 100, 1000, 10);
  buildThingSource(15, 10, "a", 10, 1000, 10);

  buildSink(6, 4);

  state.board = board;
}

function buildPowerSource(x, y, maxPower) {
  let powerSource = new PowerSource(maxPower);
  const cell = board.add(x, y, powerSource);
  let node = new PowerSourceNode(powerSource, cell.xc, cell.yc);
  powerSource.node = node;
  Loop.add(node);

  return powerSource;
}

function buildFacility(x, y, plan, capacity, powerNeeded) {
  let facility = new ConstructionFacility(plan, capacity, powerNeeded);
  let node = new FacilityNode(facility, x, y);
  facility.node = node;
  Loop.add(node);
  state.powerSource.addConsumer(facility);

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  let source = new ThingSource(thingId, capacity, msPerThing, powerNeeded);
  const cell = board.add(x, y, source);
  let node = new ThingSourceNode(source, cell.xc, cell.yc);
  source.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(source);

  return source;
}

/**
 * @param {InputOutput} producer
 * @param {InputOutput} consumer
 */
function connect(producer, consumer, cells) {
  if ((!cells || cells.length == 0) && producer === consumer) return null;

  const speed = 0.1;
  const powerPerUnitLength = 0.3;

  let path;
  if (cells && cells.length > 0) path = cells;
  else path = PathFinder.find(producer.hexaCells.values().next().value, consumer.hexaCells.values().next().value);

  if (path.length == 0) {
    message("No path found");
    return null;
  }

  let transporter = new Transporter(consumer, 0, speed, path.length * powerPerUnitLength);
  producer.addOutput(transporter);

  path.forEach(it => it.add(transporter));

  let node = new TransporterNode(transporter, path.map(it => { return {x: it.xc, y: it.yc} }));
  transporter.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(transporter);

  return transporter;
}

function buildSink(x, y) {
  const sink = new Sink();
  const cell = board.add(x, y, sink);
  const node = new SinkNode(sink, cell.xc, cell.yc);
  sink.node = node;
  Loop.add(node);

  return sink;
}

function buildABRouter(cell) {
  const router = new ABRouter(10);
  cell.add(router);
  const node = new ABRouterNode(router, cell.xc, cell.yc);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildRoundRobinRouter(cell) {
  const router = new RoundRobinRouter(10);
  cell.add(router);
  const node = new RoundRobinRouterNode(router, cell.xc, cell.yc);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}

function buildSeparator(cell, thingId, powerNeeded) {
  const router = new SeparatorRouter(thingId, powerNeeded);
  cell.add(router);
  const node = new SeparatorRouterNode(router, cell.xc, cell.yc);
  router.node = node;
  Loop.add(node);

  state.powerSource.addConsumer(router);

  return router;
}