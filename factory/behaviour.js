class BaseBehaviour {
  constructor(state) {
    this.state = state;
  }

  _pop() {
    this.state.popBehaviour(this);
  }

  onPush() {
    Keys.push();
  }

  onPop() {
    Keys.pop();
  }

  rightClick(cell) {}
  click(cell) {}
  mouseMove(cell, e) {}
  mouseLeave() {}
  mouseScrollDown(cell, e) {}
  mouseScrollUp(cell, e) {}
}

class MainBehaviour extends BaseBehaviour {
  constructor(state) {
    super(state);
    this.scrollTimer = null;
  }

  onPush() {
    super.onPush();

    Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
      let el = document.getElementById("help");

      if (el.style.display == "block") {
        el.style.display = "none";
        return;
      }

      let help = Keys.help();
      el.innerHTML =
        "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
        "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

      el.style.display = "block";
    });

    Keys.key("NumpadAdd", [], "Increase speed", e => Loop.setSpeedCoef(Math.min(10, Loop.getSpeedCoef() + 1)));
    Keys.key("NumpadSubtract", [], "Decrease speed", e => Loop.setSpeedCoef(Math.max(0, Loop.getSpeedCoef() - 1)));
    Keys.key("Digit0", [], "Reset speed to normal", e => Loop.setSpeedCoef(1.0));

    Keys.key("KeyP", ["Ctrl"], "Pause ON/OFF", () => Loop.paused() ? Loop.resume() : Loop.pause());

    Keys.key("KeyS", ["Ctrl"], "Save", () => window.localStorage.saved = JSON.stringify(Persister.persist(state)));
    Keys.key("KeyL", ["Ctrl"], "Load", () => window.localStorage.saved && Persister.restore(JSON.parse(window.localStorage.saved)));

    Keys.key("ArrowLeft", [], "Move board left", () => this.__startScrolling(10, 0), () => this.__clearScroll());
    Keys.key("ArrowRight", [], "Move board right", () => this.__startScrolling(-10, 0), () => this.__clearScroll());
    Keys.key("ArrowUp", [], "Move board up", () => this.__startScrolling(0, 10), () => this.__clearScroll());
    Keys.key("ArrowDown", [], "Move board down", () => this.__startScrolling(0, -10), () => this.__clearScroll());

    Keys.key("Space", [], "Power ON/OFF", () => {
      state.powerSource.isOn()
        ? state.powerSource.powerOff()
        : state.powerSource.powerOn();
    });
    Keys.key("KeyR", [], "Reset", () => this.state.board.reset());
  }

  onPop() {
    super.onPop();

    this.__clearScroll();
  }

  __clearScroll() {
    if (this.scrollTimer !== null) {
      Timer.clear(this.scrollTimer);
      this.scrollTimer = null;
    }
  }

  __startScrolling(dx, dy) {
    this.__clearScroll();

    if (dx != 0 || dy != 0) {
      const maxSpeed = 100;
      const speedMultiplier = 1.01;
      const scrollStepMs = 10;

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

  mouseScrollUp(cell, e) {
    for (let thing of cell.things) {
      if (e.ctrlKey && thing instanceof CountingRouter) {
        thing.count = Math.min(10, thing.count + 1);
        thing.counter = thing.count;
        return;
      }
      if (thing instanceof AbstractRouter) {
        const last = thing._outputs.pop();
        thing._outputs.unshift(last);
        return;
      }
      if (thing instanceof ThingSource) {
        thing.capacity++;
        thing.suply++;
        thing._prepare();
        return;
      }
      if (thing instanceof PowerSource) {
        thing.maxPower += e.ctrlKey ? 1000 : 1;
      }
    }
  }

  mouseScrollDown(cell, e) {
    for (let thing of cell.things) {
      if (e.ctrlKey && thing instanceof CountingRouter) {
        thing.count = Math.max(1, thing.count - 1);
        thing.counter = thing.count;
        return;
      }
      if (thing instanceof AbstractRouter) {
        let first = thing._outputs.shift();
        thing._outputs.push(first);
        return;
      }
      if (thing instanceof ThingSource) {
        if (thing.capacity > 0) thing.capacity--;
        if (thing.suply > 0) thing.suply--;
        thing._prepare();
        return;
      }
      if (thing instanceof PowerSource) {
        const dp = e.ctrlKey ? 100 : 1;
        if (thing.powerLeft >= dp) thing.maxPower -= dp;
      }
    }
  }

  mouseMove(cell, e) {
    for (let thing of cell.things) {
      if (thing instanceof ThingSource && !thing._canAddOutput()) {
        Loop.setCursor(Cursors.source);
        return;
      }

      if ((thing instanceof ThingSource
        || thing instanceof ConstructionFacility
        || thing instanceof Delay)
        && thing._canAddOutput())
      {
        Loop.setCursor(Cursors.animatedPointer);
        return;
      }

      if (thing instanceof AbstractRouter && thing._canAddOutput()) {
        Loop.setCursor(Cursors.animatedPointer);
        return;
      }
    }
    Loop.setCursor(Cursors.pointer);
    
    /*const reactionDist = 50;
    const speed = 5;

    let dx = 0;
    let dy = 0;
    if (Math.abs(e.clientX - state.canvas.clientLeft) < reactionDist) dx = speed;
    if (Math.abs(e.clientX - state.canvas.clientWidth - state.canvas.clientLeft) < reactionDist) dx = -speed;
    if (Math.abs(e.clientY - state.canvas.clientTop) < reactionDist) dy = speed;
    if (Math.abs(e.clientY - state.canvas.clientHeight - state.canvas.clientTop) < reactionDist) dy = -speed;

    this.__startScrolling(dx, dy);*/
  }

  mouseLeave() {
    // this.__clearScroll();
  }

  click(cell) {
    if (cell.things.length == 0) {
      this.state.pushBehaviour(new ContextMenuBehaviour(this.state, cell));
      return;
    }

    for (let thing of cell.things) {
      if (thing instanceof ThingSource && !thing._canAddOutput()) {
        thing.emit();
        break;
      }

      if ((thing instanceof ThingSource
        || thing instanceof ConstructionFacility
        || thing instanceof Delay)
        && thing._canAddOutput()) {
        this.state.pushBehaviour(new BuildTransporterBehaviour(thing, cell, this.state));
        break;
      }

      if (thing instanceof AbstractRouter && thing._canAddOutput()) {
        this.state.pushBehaviour(new BuildTransporterBehaviour(thing, cell, this.state));
        break;
      }
    }
  }

  rightClick(cell) {
    this.state.pushBehaviour(new ContextMenuBehaviour(this.state, cell));
  }
}

class MessageBehaviour extends BaseBehaviour {
  constructor(state, text, callback) {
    super(state);
    this.text = text;
    this.callback = callback;
  }

  onPush() {
    super.onPush();

    Keys.key("Space", [], "Hide the message", () => this._pop());
    Keys.key("Escape", [], "Hide the message", () => this._pop());
    Keys.key("Enter", [], "Hide the message", () => this._pop());

    this.__message(this.text);
  }

  onPop() {
    super.onPop();

    document.getElementById("message").style.display = "none";

    this.callback && this.callback();
  }

  click(cell) {
    this._pop();
  }

  rightClick(cell) {
    this._pop();
  }

  __message(m) {
    let root = document.getElementById("message");
    root.innerHTML = "";
    let div = document.createElement("div");
    div.innerText = m;
    root.appendChild(div);

    root.style.display = "block";

    div.onclick = () => this._pop();
  }
}

class ContextMenuBehaviour extends BaseBehaviour {
  constructor(state, cell) {
    super(state);
    this.cell = cell;
    this.menu = null;
  }

  rightClick() {
    this._pop();
  }

  click() {
    this._pop();
  }

  onPush() {
    super.onPush();

    Keys.key("Escape", [], "Close context menu", () => this._pop());

    let menu = new ContextMenu(() => this._pop());

    if (this.cell.things.length === 0) {
      state.level.factories.forEach(item => menu.add(item.name, item.callback));
      menu.addSeparator();

      menu.add("Factory", cell => this.startBuildFactory(cell));
      menu.addSeparator();

      state.level.routers.forEach(item => menu.add(item.name, item.callback));
    }

    if (this.cell.things.length > 0) {
      menu.add("Reset", cell => cell.things.forEach(thing => thing.reset()));
    }

    for (let thing of this.cell.things) {
      menu.add("Delete " + thing.id, () => this.deleteThing(thing));

      if (thing instanceof PowerSource) {
        if (thing.isOn()) menu.add("Power OFF", () => thing.powerOff());
        else menu.add("Power ON", () => thing.powerOn());
      }

      if (thing instanceof AbstractRouter) {
        menu.add("Rotate outputs", () => {
          let first = thing._outputs.shift();
          thing._outputs.push(first);
        });
      }
    }

    this.menu = menu;

    this.menu.showForCell(this.cell);
  }

  onPop() {
    super.onPop();
    this.menu.hide();
  }

  startBuildFactory(cell) {
    const str = prompt("Construction Plan");
    if (str === null) return;

    buildFacility(cell.x, cell.y, str, 10);
  }

  buildABRouter(cell) {
    buildABRouter(cell.y, cell.y);
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

class ThingBehaviour extends MainBehaviour {
  constructor(thing, cell, state) {
    super(state);
    this.cell = cell;
    this.thing = thing;
  }

  onPush() {
    super.onPush();

    Keys.key("Escape", [], "Cancel the action", () => this.finish());
  }

  finish() {
    this.state.board.clearSelection();
    this._pop();
  }

  rightClick(cell) {
    this.finish();
  }
}

class BuildTransporterBehaviour extends ThingBehaviour {
  constructor(thing, cell, state) {
    super(thing, cell, state);
    this.cells = [];
    this.lastCell = cell;
  }

  __findToConnect(cell) {
    for (let it of cell.things) {
      if (it instanceof ConstructionFacility || it instanceof Sink || it instanceof AbstractRouter
          || it instanceof Delay)
      {
        return it;
      }
    }
    return null;
  }

  mouseMove(cell, e) {
    PathFinder.find(this.lastCell, cell, this.cells)
      .forEach(it => this.state.board.select(it));
    this.cells
      .forEach(it => this.state.board.select(it));
    
    if (this.__findToConnect(cell) !== null) Loop.setCursor(Cursors.animatedPointer);
    else Loop.setCursor(Cursors.pointer);
  }

  click(cell) {
    if (this.cells.indexOf(cell) !== -1) return;

    let connectTo = this.__findToConnect(cell);

    if (connectTo !== null || cell.things.length == 0) {
      let path = PathFinder.find(this.lastCell, cell, this.cells);
      for (let i = 1; i < path.length; i++) this.cells.push(path[i]);
      this.lastCell = cell;
    }

    if (connectTo && this.cells.length > 0) {
      this.cells.unshift(this.cell);
      connect(this.thing, connectTo, this.cells);
      this.finish();
    }
  }
}
