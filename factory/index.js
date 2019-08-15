const STATE_BUILD_TRANSPORTER = "build-transporter";
const STATE_CONNECT_TO_POWER = "connect-to-power";

function defaultClick(cell) {
  console.log("[state]", cell);
  console.log("[state]", state.state, state.from);
  try {
    if (state.state == STATE_BUILD_TRANSPORTER) {
      cell.things.filter(it => it instanceof ConstructionFacility || it instanceof Sink)
        .forEach(it => connect(state.from, it));
      state.state = null;
      return;
    }

    if (state.state == STATE_CONNECT_TO_POWER) {
      cell.things.filter(it => it instanceof ConstructionFacility || it instanceof Transporter || it instanceof ThingSource)
        .forEach(it => {
          state.from.addConsumer(it, 10);
          console.log("Connected power", state.from, it);
        });
        state.state = null;
        return;
    }

    for (let thing of cell.things) {
      if (thing instanceof ThingSource || thing instanceof ConstructionFacility) {
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
  } finally {
    console.log("[state]", state.state, state.from);
  }
}

let state = {
  sink: null,

  click: defaultClick,
  resetClick: () => state.click = defaultClick,

  resetState: () => {
    state.resetClick();
    state.state = null;
  },

  startBuildIronFactory: () => {
    state.click = (cell) => {
      let plan = new ConstructionPlan([new PlanItem("iron-ore", 2)],
        [new PlanItem("iron", 1), new PlanItem("slag", 1)],
        5000);
      let facility = buildFacility(cell.xc, cell.yc, plan, 2, 10);
      cell.add(facility);

      state.resetState();
    };
  },

  startBuildTubeFactory: () => {
    state.click = (cell) => {
      let plan = new ConstructionPlan([new PlanItem("iron", 2)],
        [new PlanItem("tube", 1)],
        1000);
      let facility = buildFacility(cell.xc, cell.yc, plan, 1, 10);

      cell.add(facility);

      state.resetState();
    };
  },

  startBuildKhifeFactory: () => {
    state.click = (cell) => {
      let plan = new ConstructionPlan([new PlanItem("tube", 1), new PlanItem("plastic", 1)],
        [new PlanItem("knife", 2)],
        1000);
      let facility = buildFacility(cell.xc, cell.yc, plan, 2, 10);

      cell.add(facility);

      state.resetState();
    };
  },

  startBuildABRouter: () => {
    state.click = (cell) => {
      buildABRouter(cell);
      state.resetState();
    };
  },

  startBuildSource: () => {
    console.log("source");
  },

  deleteThing: function (thing) {
    thing.destroy();
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
  
  buildThingSource(0, 0, "plastic", 100, 1000, 10);
  buildThingSource(15, 10, "iron-ore", 100, 1000, 10);
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
  producer.output = transporter;

  path.forEach(it => it.add(transporter));

  let node = new TransporterNode(transporter, path.map(it => { return {x: it.xc, y: it.yc} }));
  transporter.node = node;
  Loop.add(node);

  console.log("connected", producer, consumer);

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