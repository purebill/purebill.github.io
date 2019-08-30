class BaseBehaviour {
  constructor(state) {
    this.state = state;
  }

  onPop() {}

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
    this.state.pushBehaviour(new ContextMenuBehaviour(this.state, cell));
  }
}

class ContextMenuBehaviour extends BaseBehaviour {
  constructor(state, cell) {
    super(state);

    Keys.key("Escape", "Close context menu", () => {
      this.state.popBehaviour();
    });

    let menu = new ContextMenu(() => this.state.popBehaviour());

    if (cell.things.length === 0) {
      menu.add("*,a -> A", (cell) => {
        let plans = "*,a->A | *,b->B | *,c->C | *,d->D | *,e->E"
          .split(/\s*\|\s*/)
          .map(str => ConstructionPlan.from(str));
        let facility = buildFacility(cell, plans, 1, 10);
        facility.name = "*,a -> A";
      });
      menu.add("B -> b,a", (cell) => {
        let plans = "A->a,a | B->b,a | C->c,a | D->d,a | E->e,a"
          .split(/\s*\|\s*/)
          .map(str => ConstructionPlan.from(str));
        let facility = buildFacility(cell, plans, 1, 10);
        facility.name = "B -> b,a";
      });
      menu.add("a >> z", (cell) => {
        let plans = "a->b | b->c | c->d | d->e | e->a"
          .split(/\s*\|\s*/)
          .map(str => ConstructionPlan.from(str));
        let facility = buildFacility(cell, plans, 1, 10);
        facility.name = "a >> z";
      });
      menu.add("a << z", (cell) => {
        let plans = "a->e | b->a | c->b | d->c | e->d"
          .split(/\s*\|\s*/)
          .map(str => ConstructionPlan.from(str));
        let facility = buildFacility(cell, plans, 1, 10);
        facility.name = "a << z";
      });
      menu.addSeparator();

      menu.add("Factory", (cell) => this.startBuildFactory(cell));
      menu.addSeparator();

      menu.add("Separator", (cell) => this.startBuildSeparator(cell));
      menu.add("Round Robin", (cell) => buildRoundRobinRouter(cell));
      menu.add("Counting Router", (cell) => this.startBuildCountingRouter(cell));
      menu.addSeparator();

      menu.add("Source", (cell) => this.startBuildSource(cell));
      menu.addSeparator();

      menu.add("Reset", () => this.state.board.reset());
    }

    for (let thing of cell.things) {
      menu.add("Delete " + thing.id, () => this.deleteThing(thing));

      if (thing instanceof PowerSource) {
        if (thing.isOn()) menu.add("Power OFF", () => thing.powerOff());
        else menu.add("Power ON", () => thing.powerOn());
      }
    }

    this.menu = menu;

    this.menu.showForCell(cell);
  }

  rightClick() {
    this.state.popBehaviour();
  }

  click() {
    this.state.popBehaviour();
  }

  onPop() {
    super.onPop();
    this.menu.hide();
  }

  startBuildFactory(cell) {
    const str = prompt("Construction Plan");
    if (str === null) return;

    let plans = str.split(/\s*\|\s*/).map(str => ConstructionPlan.from(str));
    let facility = buildFacility(cell, plans, 1, 10);
  }

  startBuildCountingRouter(cell) {
    const str = prompt("Count");
    if (str === null) return;
    let count = parseInt(str);
    if (isNaN(count)) return;

    buildCountingRouter(cell, count, 10);
  }

  startBuildSeparator(cell) {
    const str = prompt("Thing to separate");
    if (str === null) return;

    buildSeparator(cell, str, 10);
  }

  buildABRouter(cell) {
    buildABRouter(cell);
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

    Keys.key("Escape", "Cancel the action", () => this.finish());
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
