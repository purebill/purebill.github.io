const STATE_BUILD_TRANSPORTER = "build-transporter";
const STATE_CONNECT_TO_POWER = "connect-to-power";

function defaultClick(cell) {
  console.log("[state]", cell);
  console.log("[state]", state.state, state.from);
  try {
    if (state.state == STATE_BUILD_TRANSPORTER) {
      cell.things.filter(it => it instanceof ConstructionFacility)
        .forEach(it => {
          connect(state.from, it, 1);
        });
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
      let facility = buildFacility(cell.xc, cell.yc, plan, 2, null, 10);
      cell.add(facility);

      state.resetState();
    };
  },

  startBuildTubeFactory: () => {
    state.click = (cell) => {
      let plan = new ConstructionPlan([new PlanItem("iron", 2)],
        [new PlanItem("tube", 1)],
        1000);
      let facility = buildFacility(cell.xc, cell.yc, plan, 1, null, 10);

      cell.add(facility);

      state.resetState();
    };
  },

  startBuildKhifeFactory: () => {
    state.click = (cell) => {
      let plan = new ConstructionPlan([new PlanItem("tube", 1), new PlanItem("plastic", 1)],
        [new PlanItem("knife", 2)],
        1000);
      let facility = buildFacility(cell.xc, cell.yc, plan, 2, null, 10);

      cell.add(facility);

      state.resetState();
    };
  },

  startBuildTransporter: () => {
    console.log("transporter");
  },

  startBuildSource: () => {
    console.log("source");
  }
};
StateUi(state);

let board;
let nodes = [];
let output = {
  _in: function (thing) {
    console.debug(thing.id + " constructed");
    return true;
  }
};

createWorld();

Loop.add(render);
Loop.start();

function createWorld() {
  board = new HexaBoard(20, 25);
  nodes.push(board);
  
  buildThingSource(0, 0, "plastic", 100, 10000, 10);
  buildThingSource(15, 10, "iron-ore", 100, 5000, 10);
  buildPowerSource(7, 5, 100);
}

function render(ctx) {
  nodes.forEach(node => node.draw(ctx));
}

function buildPowerSource(x, y, maxPower) {
  let powerSource = new PowerSource(maxPower);
  const cell = board.add(x, y, powerSource);
  let node = new PowerSourceNode(powerSource, cell.xc, cell.yc);
  powerSource.node = node;
  nodes.push(node);

  return powerSource;
}

function buildFacility(x, y, plan, capacity, output, powerNeeded) {
  output = output || {
      _in: function (thing) {
        console.log(thing.id + " constructed");
        return true;
      }
    };

  let facility = new ConstructionFacility(plan, capacity, output, powerNeeded);
  let node = new FacilityNode(facility, x, y);
  facility.node = node;
  nodes.push(node);

  return facility;
}

function buildThingSource(x, y, thingId, capacity, msPerThing, powerNeeded) {
  let source = new ThingSource(thingId, capacity, msPerThing, powerNeeded);
  const cell = board.add(x, y, source);
  let node = new ThingSourceNode(source, cell.xc, cell.yc);
  source.node = node;
  nodes.push(node);

  return source;
}

function connect(producer, consumer, capacity) {
  const speed = 0.1;
  const powerPerUnitLength = 0.3;

  let path = PathFinder.find(producer.hexaCell, consumer.hexaCell);
  if (path.length == 0) {
    message("No path found");
    return null;
  }

  let transporter = new Transporter(consumer, 0, speed, capacity, path.length * powerPerUnitLength);
  producer.output = transporter;

  path.forEach(it => it.add(transporter));

  let node = new TransporterNode(transporter, path.map(it => { return {x: it.xc, y: it.yc} }));
  transporter.node = node;
  nodes.push(node);

  console.log("connected", producer, consumer);

  return transporter;
}