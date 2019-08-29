const STATE_BUILD_TRANSPORTER = "build-transporter";
const STATE_CONNECT_TO_POWER = "connect-to-power";

class BaseBehaviour {
  constructor(state) {
    this.state = state;
  }

  mouseMove(cell) {}

  click(cell) {
    for (let thing of cell.things) {
      if ((thing instanceof ThingSource
        || thing instanceof ConstructionFacility)
        && thing._canAddOutput()) {
        this.state.pushBehaviour(new BuildTransporterBehaviour(thing, cell, this.state));
        break;
      }

      if (thing instanceof AbstractRouter && thing._canAddOutput()) {
        this.state.pushBehaviour(new BuildTransporterBehaviour(thing, cell, this.state));
        break;
      }

      if (thing instanceof PowerSource) {
        this.state.pushBehaviour(new ConnectPowerBehaviour(thing, cell, this.state));
        break;
      }
    }
  }

  rightClick(cell) {
    const menu = this.state.contextMenu;
    menu.hide();

    if (cell.things.length === 0) {
      menu.add("Factory", (cell) => this.startBuildFactory(cell));
      menu.addSepartor();
      menu.add("Separator Router", (cell) => this.startBuildSeparator(cell));
      menu.add("Round Robin Router", (cell) => this.buildRoundRobinRouter(cell));
      menu.addSepartor();
      menu.add("Source", (cell) => this.startBuildSource(cell));
      menu.addSepartor();
    }

    for (let thing of cell.things) {
      menu.add("Delete " + thing.id, () => this.deleteThing(thing));

      if (thing instanceof PowerSource) {
        if (thing.isOn()) menu.add("Power OFF", () => thing.powerOff());
        else menu.add("Power ON", () => thing.powerOn());
      }
    }

    menu.showForCell(cell);
  }

  startBuildFactory(cell) {
    const str = prompt("Construction Plan");
    if (str === null) return;

    let plan = ConstructionPlan.from(str);
    let facility = buildFacility(cell.xc, cell.yc, plan, 2, 10);
    cell.add(facility);
  }

  startBuildSeparator(cell) {
    const str = prompt("Thing to separate");
    if (str === null) return;

    buildSeparator(cell, str, 10);
  }

  buildABRouter(cell) {
    buildABRouter(cell);
  }

  buildRoundRobinRouter(cell) {
    buildRoundRobinRouter(cell);
  }

  startBuildSource() {
    console.log("source");
  }

  deleteThing(thing) {
    const thingsToDestroy = [];

    if (thing instanceof InputOutput && !(thing instanceof Transporter)) {
      thing._outputs.forEach(it => thingsToDestroy.push(it));
      thing.inputs.forEach(it => thingsToDestroy.push(it));
    }

    thing.destroy();

    thingsToDestroy.forEach(it => it.destroy());
  }
}

class ThingBehaviour extends BaseBehaviour {
  constructor(thing, cell, state) {
    super(state);
    this.cell = cell;
    this.thing = thing;
  }

  mouseMove(cell) {
    PathFinder.find(this.cell, cell).forEach(it => this.state.board.select(it));
  }

  finish() {
    this.state.board.clearSelection();
    this.state.popBehaviour();
  }

  rightClick(cell) {
    this.finish();
  }
}

class ConnectPowerBehaviour extends ThingBehaviour {
  constructor(thing, cell, state) {
    super(thing, cell, state);
  }

  click(cell) {
    cell.things
      .filter(it => it instanceof ConstructionFacility || it instanceof Transporter || it instanceof ThingSource || it instanceof AbstractRouter)
      .forEach(it => this.thing.addConsumer(it, 10));

    this.finish();
  }
}

class BuildTransporterBehaviour extends ThingBehaviour {
  constructor(thing, cell, state) {
    super(thing, cell, state);
    this.cells = [];
    this.lastCell = cell;
  }

  mouseMove(cell) {
    PathFinder.find(this.lastCell, cell, this.cells)
      .forEach(it => this.state.board.select(it));
    this.cells
      .forEach(it => this.state.board.select(it));
  }

  click(cell) {
    if (this.cells.indexOf(cell) !== -1) return;

    let connectTo = null;
    for (let it of cell.things) {
      if (it instanceof ConstructionFacility || it instanceof Sink || it instanceof AbstractRouter) {
        connectTo = it;
      }
    }

    if (connectTo !== null || cell.things.length == 0) {
      let path = PathFinder.find(this.lastCell, cell, this.cells);
      for (let i = this.cells.length > 0 ? 0 : 1; i < path.length - 1; i++) this.cells.push(path[i]);
      this.lastCell = cell;
    }

    if (connectTo && this.cells.length > 0) {
      this.cells.unshift(this.cell);
      this.cells.push(cell);
      connect(this.thing, connectTo, this.cells);
      this.finish();
    }
  }
}
