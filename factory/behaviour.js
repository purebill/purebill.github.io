class BaseBehaviour {
  constructor(state) {
    this.state = state;
    this.scrollTimer = null;

    Keys.key("KeyS", ["Ctrl"], "Save", () => window.localStorage.saved = JSON.stringify(Persister.persist(state)));
    Keys.key("KeyL", ["Ctrl"], "Load", () => Persister.restore(JSON.parse(window.localStorage.saved)));

    Keys.key("ArrowLeft", [], "Move board left", () => state.board.shift(-10, 0));
    Keys.key("ArrowRight", [], "Move board right", () => state.board.shift(10, 0));
    Keys.key("ArrowUp", [], "Move board up", () => state.board.shift(0, -10));
    Keys.key("ArrowDown", [], "Move board down", () => state.board.shift(0, 10));

    Keys.key("KeyR", ["Ctrl"], "Reset", () => this.state.board.reset());
  }

  onPop() {
    this.__clearScroll();
  }

  __clearScroll() {
    if (this.scrollTimer !== null) {
      Timer.clear(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  mouseLeave() {
    this.__clearScroll();
  }

  mouseMove(cell, e) {
    const reactionDist = 50;
    const speed = 10;
    const maxSpeed = 100;
    const speedMultiplier = 1.01;
    const scrollStepMs = 10;

    let dx = 0;
    let dy = 0;
    if (Math.abs(e.clientX - state.canvas.clientLeft) < reactionDist) dx = speed;
    if (Math.abs(e.clientX - state.canvas.clientWidth - state.canvas.clientLeft) < reactionDist) dx = -speed;
    if (Math.abs(e.clientY - state.canvas.clientTop) < reactionDist) dy = speed;
    if (Math.abs(e.clientY - state.canvas.clientHeight - state.canvas.clientTop) < reactionDist) dy = -speed;

    this.__clearScroll();

    if (dx != 0 || dy != 0) {
      this.scrollTimer = Timer.periodic(() => {
        let x = this.state.board.xShift + dx;
        let y = this.state.board.yShift + dy;

        if (Math.abs(dx) < maxSpeed) dx *= speedMultiplier;
        if (Math.abs(dy) < maxSpeed) dy *= speedMultiplier;

        const boardWidth = (this.state.board.width - 1) * 3 * this.state.board.r + 2.5*this.state.board.r;
        const boardHeight = this.state.board.height * this.state.board.h;

        const maxX = this.state.board.r;

        let minX = this.state.canvas.width - boardWidth;
        if (minX > 0) minX = 0;

        const maxY = this.state.board.h;
        let minY = this.state.canvas.height - boardHeight;
        if (minY > 0) minY = 0;

        if (x > maxX) x = maxX;
        if (x < minX) x = minX;
        if (y > maxY) y = maxY;
        if (y < minY) y = minY;

        this.state.board.xShift = x;
        this.state.board.yShift = y;

      }, scrollStepMs);
    }
  }

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

    Keys.key("Escape", [], "Close context menu", () => this.state.popBehaviour());

    let menu = new ContextMenu(() => this.state.popBehaviour());

    if (cell.things.length === 0) {
      menu.add("*,a -> A", (cell) => {
        let facility = buildFacility(cell.x, cell.y, "*,a->A | *,b->B | *,c->C | *,d->D | *,e->E", 1, 10);
        facility.name = "*,a -> A";
      });
      menu.add("B -> b,a", (cell) => {
        let facility = buildFacility(cell.x, cell.y, "A->a,a | B->b,a | C->c,a | D->d,a | E->e,a", 1, 10);
        facility.name = "B -> b,a";
      });
      menu.add("a >> z", (cell) => {
        let facility = buildFacility(cell.x, cell.y, "a->b | b->c | c->d | d->e | e->a", 1, 10);
        facility.name = "a >> z";
      });
      menu.add("a << z", (cell) => {
        let facility = buildFacility(cell.x, cell.y, "a->e | b->a | c->b | d->c | e->d", 1, 10);
        facility.name = "a << z";
      });
      menu.addSeparator();

      menu.add("Factory", (cell) => this.startBuildFactory(cell));
      menu.addSeparator();

      menu.add("Separator", (cell) => this.startBuildSeparator(cell));
      menu.add("Round Robin", (cell) => buildRoundRobinRouter(cell.x, cell.y));
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

    buildFacility(cell.x, cell.y, str, 1, 10);
  }

  startBuildCountingRouter(cell) {
    const str = prompt("Count");
    if (str === null) return;
    let count = parseInt(str);
    if (isNaN(count)) return;

    buildCountingRouter(cell.x, cell.y, count, 10);
  }

  startBuildSeparator(cell) {
    const str = prompt("Thing to separate");
    if (str === null) return;

    buildSeparator(cell.x, cell.y, str, 10);
  }

  buildABRouter(cell) {
    buildABRouter(cell.y, cell.y);
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

    Keys.key("Escape", [], "Cancel the action", () => this.finish());
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

  mouseMove(cell, e) {
    PathFinder.find(this.lastCell, cell, this.cells)
      .forEach(it => this.state.board.select(it));
    this.cells
      .forEach(it => this.state.board.select(it));

    super.mouseMove(cell, e);
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
