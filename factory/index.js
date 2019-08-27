const STATE_BUILD_TRANSPORTER = "build-transporter";
const STATE_CONNECT_TO_POWER = "connect-to-power";

function defaultClick(cell) {
  if (state.state == STATE_BUILD_TRANSPORTER) {
    cell.things.filter(it => it instanceof ConstructionFacility
      || it instanceof Sink
      || it instanceof AbstractRouter)
      .forEach(it => connect(state.from, it));
    state.state = null;
    return;
  }

  if (state.state == STATE_CONNECT_TO_POWER) {
    cell.things
      .filter(it => it instanceof ConstructionFacility
        || it instanceof Transporter
        || it instanceof ThingSource
        || it instanceof AbstractRouter)
      .forEach(it => state.from.addConsumer(it, 10));

    state.state = null;
    return;
  }

  for (let thing of cell.things) {
    if ((thing instanceof ThingSource
         || thing instanceof ConstructionFacility)
      && thing._canAddOutput()) {
      state.state = STATE_BUILD_TRANSPORTER;
      state.from = thing;
      break;
    }

    if (thing instanceof AbstractRouter && thing._canAddOutput()) {
      state.state = STATE_BUILD_TRANSPORTER;
      state.from = thing;
      break;
    }

    if (thing instanceof PowerSource) {
      state.state = STATE_CONNECT_TO_POWER;
      state.from = thing;
      break;
    }
  }
}

function rightClick(cell) {
  if (cell === null) return;
  if (state.state !== null) return;

  const menu = state.contextMenu;
  menu.hide();

  if (cell.things.length === 0) {
    menu.add("Factory", state.startBuildFactory);
    menu.addSepartor();
    menu.add("Separator Router", state.startBuildSeparator);
    menu.add("Round Robin Router", state.buildRoundRobinRouter);
    menu.addSepartor();
    menu.add("Source", state.startBuildSource);
    menu.addSepartor();
  }

  for (let thing of cell.things) {
    menu.add("Delete " + thing.id, () => state.deleteThing(thing));

    if (thing instanceof PowerSource) {
      if (thing.isOn()) menu.add("Power OFF", () => thing.powerOff());
      else menu.add("Power ON", () => thing.powerOn());
    }
  }

  menu.showForCell(cell);
}

let state = {
  state: null,

  sink: null,
  
  contextMenu: new ContextMenu(),

  click: defaultClick,
  resetClick: () => state.click = defaultClick,
  rightClick: rightClick,

  resetState: () => {
    state.contextMenu.hide();
    state.resetClick();
    state.state = null;
  },

  startBuildFactory: (cell) => {
    const str = prompt("Construction Plan");
    if (str === null) return;

    let plan = ConstructionPlan.from(str);
    let facility = buildFacility(cell.xc, cell.yc, plan, 2, 10);
    cell.add(facility);

    state.resetState();
  },

  startBuildSeparator: (cell) => {
    const str = prompt("Thing to separate");
    if (str === null) return;

    buildSeparator(cell, str, 10);
    state.resetState();
  },

  buildABRouter: (cell) => {
    buildABRouter(cell);
    state.resetState();
  },

  buildRoundRobinRouter: (cell) => {
    buildRoundRobinRouter(cell);
    state.resetState();
  },

  startBuildSource: () => {
    console.log("source");
  },

  deleteThing: function (thing) {
    const thingsToDestroy = [];

    if (thing instanceof InputOutput && !(thing instanceof Transporter)) {
      thing._outputs.forEach(it => thingsToDestroy.push(it));
      thing.inputs.forEach(it => thingsToDestroy.push(it));
    }

    thing.destroy();

    thingsToDestroy.forEach(it => it.destroy());
  }
};
StateUi(state);

/** @type {HexaBoard} */
let board;

createWorld();

Loop.start();

function createWorld() {
  board = new HexaBoard(20, 25);
  Loop.add(board);
  
  // buildThingSource(0, 0, "plastic", 100, 1000, 10);
  buildThingSource(15, 10, "a", 10, 1000, 10);
  buildPowerSource(7, 5, 100);

  state.sink = buildSink(6, 4);
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

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  let source = new ThingSource(thingId, capacity, msPerThing, powerNeeded);
  const cell = board.add(x, y, source);
  let node = new ThingSourceNode(source, cell.xc, cell.yc);
  source.node = node;
  Loop.add(node);

  return source;
}

/**
 * @param {InputOutput} producer
 * @param {InputOutput} consumer
 */
function connect(producer, consumer) {
  if (producer === consumer) return null;

  const speed = 0.1;
  const powerPerUnitLength = 0.3;

  let path = PathFinder.find(producer.hexaCells.values().next().value, consumer.hexaCells.values().next().value);
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

  return transporter;
}

function buildSink(x, y) {
  const sink = new Sink();
  state.sink = sink;

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
  return router;
}

function buildRoundRobinRouter(cell) {
  const router = new RoundRobinRouter(10);
  cell.add(router);
  const node = new RoundRobinRouterNode(router, cell.xc, cell.yc);
  router.node = node;
  Loop.add(node);
  return router;
}

function buildSeparator(cell, thingId, powerNeeded) {
  const router = new SeparatorRouter(thingId, powerNeeded);
  cell.add(router);
  const node = new SeparatorRouterNode(router, cell.xc, cell.yc);
  router.node = node;
  Loop.add(node);
  return router;
}