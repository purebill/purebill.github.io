class AbstractNode {
  constructor() {}

  destroy() {
    Loop.remove(this);
  }

  draw(ctx) {
    throw new Error("draw() not implemented");
  }

  __markOutput(ctx, idx) {
    if (idx < this.router._outputs.length && this.router._outputs[idx] instanceof Transporter) {
      const cell1 = this.router._outputs[idx].cells[0];
      const cell2 = this.router._outputs[idx].cells[1];
      const x = (cell1.xc + cell2.xc) / 2;
      const y = (cell1.yc + cell2.yc) / 2;
      ctx.fillStyle = "#009900";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  __markFirstOutput(ctx) {
    this.__markOutput(ctx, 0);
  }

  static drawWaitingThings(thing, ctx, x, y) {
    ctx.fillStyle = "#990000";
    ctx.font = "12px serif";
    let xx = x;
    let yy = y + 20;
    thing.waitingThings.forEach(thing => {
      ctx.fillText(thing.id, xx, yy);
      yy += 14;
    });
  }

  static drawProgress(box, ctx, x, y) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, 2 * Math.PI * box.progress);
    ctx.stroke();
  }

  static drawTimeLock(timeLock, ctx, x, y) {
    if (timeLock.size == 1) {
      AbstractNode.drawProgress(timeLock.slots[0], ctx, x, y);
      return;
    }

    const r = 10;

    for (let i = 0; i < timeLock.slots.length; i++) {
      AbstractNode.drawProgress(timeLock.slots[i], ctx, x + (2*r+5)*(i+1), y + 20);
    }
  }
}

class PowerSourceNode extends AbstractNode {
  constructor(/**@type {PowerSource} */ powerSource) {
    super();

    this.powerSource = powerSource;
  }

  draw(ctx) {
    ctx.fillStyle = "#006600";

    const x = this.powerSource.hexaCell.xc;
    const y = this.powerSource.hexaCell.yc;

    if (this.powerSource.isOn())
      ctx.fillRect(x - 5, y - 5, 10, 10);
    else {
      ctx.strokeStyle = "#006600";
      ctx.strokeRect(x - 5, y - 5, 10, 10);
    }

    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(Math.round(this.powerSource.powerLeft) + " / " + this.powerSource.maxPower, x + 10, y + 10);

    /*for (let box of this.powerSource.consumers) {
      if (this.powerSource.isOn()) ctx.strokeStyle = "rgba(0, 100, 0, .2)";
      else ctx.strokeStyle = "rgba(255, 0, 0, .2)";
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(box.consumer.node.x, box.consumer.node.y);
      ctx.stroke();
    }*/
  }
}

class ThingSourceNode extends AbstractNode {
  constructor(/**@type {ThingSource} */ thingSource) {
    super();

    this.thingSource = thingSource;
  }

  draw(ctx) {
    const x = this.thingSource.hexaCell.xc;
    const y = this.thingSource.hexaCell.yc;

    ctx.fillStyle = "#0000ff";
    ctx.fillRect(x - 5, y - 5, 10, 10);

    ctx.font = "16px serif";
    ctx.fillText(this.thingSource.thingId + ": " + this.thingSource.suply, x + 10, y + 10);

    AbstractNode.drawWaitingThings(this.thingSource, ctx, x, y);

    AbstractNode.drawTimeLock(this.thingSource.timeLock, ctx, x, y);
  }
}

class FacilityNode extends AbstractNode {
  constructor(/**@type {ConstructionFacility} */ facility) {
    super();

    this.facility = facility;
  }

  draw(ctx) {
    const xc = this.facility.hexaCell.xc;
    const yc = this.facility.hexaCell.yc;

    ctx.fillStyle = "#000000";
    ctx.fillRect(xc - 5, yc - 5, 10, 10);

    let x = xc + 10;
    let y = yc - 10;
    ctx.font = "16px serif";

    ctx.fillStyle = "#000000";
    let name = this.facility.name || this.facility.constructionPlans.toString();
    ctx.fillText(name, xc, yc + 20);

    for (let box of this.facility.boxes) {
      for (let k of box.slots.keys()) {
        box.slots.get(k).forEach(id => {
          if (id === null) ctx.fillStyle = "#cccccc";
          else ctx.fillStyle = "#000000";

          ctx.fillText(k, x, y);

          y -= 15;
        });
      }

      if (box.timeLockBox) {
        AbstractNode.drawProgress(box.timeLockBox, ctx, xc, yc);
      }

      y -= 5;
    }

    AbstractNode.drawWaitingThings(this.facility, ctx, xc, yc);
  }
}

class TransporterNode extends AbstractNode {
  constructor(/**@type {Transporter} */ transporter) {
    super();

    this.color = "#000000";
   
    this.transporter = transporter;

    const centerIdx = Math.round(transporter.cells.length / 2);
    this.centerCell = transporter.cells[centerIdx];
  }

  pointForProgress(progress) {
    let l = progress * this.transporter.length;
    let accL = 0;
    let i;
    const points = this.transporter.cells;
    for (i = 1; i < points.length; i++) {
      accL += 1;
      if (accL >= l) {
        progress = 1 - (accL - l);
        break;
      }
    }

    let x = points[i - 1].xc + (points[i].xc - points[i - 1].xc) * progress;
    let y = points[i - 1].yc + (points[i].yc - points[i - 1].yc) * progress;

    return {x, y};
  }

  draw(ctx) {
    const points = this.transporter.cells;

    if (points.length < 2) return;

    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo((points[0].xc + points[1].xc) / 2, (points[0].yc + points[1].yc) / 2);
    for (let i = 1; i < points.length - 1; i++) {
      const point = points[i];
      ctx.lineTo(point.xc, point.yc);
    }
    const endX = (points[points.length - 1].xc + points[points.length - 2].xc) / 2;
    const endY = (points[points.length - 1].yc + points[points.length - 2].yc) / 2;
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arraw
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const startX = points[points.length - 2].xc;
    const startY = points[points.length - 2].yc;
    const dx = endX - startX;
    const dy = endY - startY;
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX - dy/5, startY + dx/5);
    ctx.lineTo(endX, endY);
    ctx.lineTo(startX + dy/5, startY - dx/5);
    ctx.lineTo(startX, startY);
    ctx.fill();

    for (let box of this.transporter.timeLock.slots) {
      let p = this.pointForProgress(box.progress);

      let textPoint = {x: p.x + 10, y: p.y};

      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "16px serif";
      ctx.fillText(box.thing.id, textPoint.x, textPoint.y);
    }

    AbstractNode.drawWaitingThings(this.transporter, ctx, this.centerCell.xc, this.centerCell.yc);
  }
}

class HexaCell {
  constructor(x, y, board, xc, yc) {
    this.x = x;
    this.y = y;
    this._xc = xc;
    this._yc = yc;
    this.board = board;
    this.selected = false;
    /**@type {Thing[]} */
    this.things = [];

    /**@type {HexaCell[]} */
    this._neighboursCache = undefined;
  }

  get xc() {
    return this.board.xShift + this._xc;
  }

  get yc() {
    return this.board.yShift + this._yc;
  }

  reset() {
    this.things.forEach(thing => thing.reset());
  }

  /**
   * @param {Thing} thing 
   */
  add(thing) {
    this.things.push(thing);
    thing.hexaCells.add(this);
  }

  /**
   * Remove the thing from the cell.
   * 
   * @param {Thing} thing 
   */
  remove(thing) {
    let idx= this.things.findIndex(it => it === thing);
    if (idx !== -1) {
      this.things.splice(idx, 1);
      thing.hexaCells.delete(this);
      return true;
    }

    return false;
  }

  _hex(ctx) {
    const xc = this.xc;
    const yc = this.yc;
    const r = this.board.r;
    const h = this.board.h;

    ctx.beginPath();
    // ctx.arc(xc, yc, 3, 0, 2*Math.PI);
    ctx.moveTo(xc - r, yc);
    ctx.lineTo(xc - r/2, yc - h);
    ctx.lineTo(xc + r/2, yc - h);
    ctx.lineTo(xc + r, yc);
    ctx.lineTo(xc + r/2, yc + h);
    ctx.lineTo(xc - r/2, yc + h);
    ctx.lineTo(xc - r, yc);
  }

  draw(ctx) {
    ctx.strokeStyle = "#cccccc";
    ctx.fillStyle = "#eeeeee";
    if (this.selected) {
      this._hex(ctx);
      ctx.fill();
      this._hex(ctx);
      ctx.stroke();
    }
    else {
      this._hex(ctx);
      ctx.stroke();
    }

    // ctx.font = "12px sefif";
    // let text = this.x + ", " + this.y;
    // let m = ctx.measureText(text);
    // ctx.strokeText(text, xc - m.width / 2, yc + 6);
  }

  neighbours() {
    if (this._neighboursCache) return this._neighboursCache;

    const b = this.board.cells;

    let a = [];

    if (this.y > 1)
      a.push(b[this.x][this.y - 2]);
    
    if (this.y < this.board.height - 2)
      a.push(b[this.x][this.y + 2]);

    if (this.x % 2 == 0) {
      if (this.y % 2 == 0) {
        if (this.x > 0 && this.y > 0)
          a.push(b[this.x - 1][this.y - 1]);

        if (this.x > 0 && this.y < this.board.height - 1)
          a.push(b[this.x - 1][this.y + 1]);

        if (this.y > 0)
          a.push(b[this.x][this.y - 1]);

        if (this.y < this.board.height - 1)
          a.push(b[this.x][this.y + 1]);
      } else {
        if (this.y > 0)
          a.push(b[this.x][this.y - 1]);
        if (this.y < this.board.height -1)
          a.push(b[this.x][this.y + 1]);
        if (this.x < this.board.width - 1 && this.y > 0)
          a.push(b[this.x + 1][this.y - 1]);
        if (this.x < this.board.width - 1 && this.y < this.board.height - 1)
          a.push(b[this.x + 1][this.y + 1]);
      }
    } else {
      if (this.y % 2 == 0) {
        if (this.x > 0 && this.y > 0)
          a.push(b[this.x - 1][this.y - 1]);
        if (this.x > 0 && this.y < this.board.height - 1)
          a.push(b[this.x - 1][this.y + 1]);
        if (this.y > 0)
          a.push(b[this.x][this.y - 1]);
        if (this.y < this.board.height - 1)
          a.push(b[this.x][this.y + 1]);

      } else {
        if (this.y > 0)
          a.push(b[this.x][this.y - 1]);
        if (this.y < this.board.height -1)
          a.push(b[this.x][this.y + 1]);
        if (this.x < this.board.width - 1 && this.y > 0)
          a.push(b[this.x + 1][this.y - 1]);
        if (this.x < this.board.width - 1 && this.y < this.board.height - 1)
          a.push(b[this.x + 1][this.y + 1]);
      }
    }

    this._neighboursCache = a;

    return a;
  }
}

class HexaBoard {
  constructor(width, height, canvas) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.r = 20;
    this.h = this.r * Math.sqrt(3) / 2;
    this.xShift = this.r;
    this.yShift = this.h;
    /**@type {Set<HexaCell>} */
    this.selected = new Set();

    /**@type {HexaCell[][]} */
    this.cells = [];
    for (let x = 0; x < width; x++) {
      this.cells[x] = [];
      for (let y = 0; y < height; y++) {
        const r = this.r;
        const h = this.h;
    
        let yc = y * h;
        let xc = x * r * 3;
    
        if (y % 2 == 1) {
          xc += 1.5*r;
        }
    
        this.cells[x][y] = new HexaCell(x, y, this, xc, yc);
      }
    }
  }

  reset() {
    this.cells.forEach(col => col.forEach(cell => cell.reset()));
  }

  add(x, y, thing) {
    assert(x >= 0 && x < this.width && y >= 0 && y < this.height);

    const cell = this.cells[x][y];
    cell.add(thing);
    return cell;
  }

  getVisibleCells() {
    let leftTop = this.fromCoords(0, 0);
    if (leftTop == null) leftTop = this.cells[0][0];

    let rightBottom = this.fromCoords(this.canvas.width, this.canvas.height);
    if (rightBottom == null) rightBottom = this.cells[this.width - 1][this.height - 1];

    return {leftTop, rightBottom};
  }

  draw(ctx) {
    let {leftTop, rightBottom} = this.getVisibleCells();

    for (let x = leftTop.x; x <= rightBottom.x; x++) {
      for (let y = leftTop.y; y <= rightBottom.y; y++) {
        this.cells[x][y].draw(ctx);
      }
    }
  }

  clearSelection() {
    this.selected.forEach(it => it.selected = false);
    this.selected.clear();
  }

  select(cell) {
    if (cell) {
      cell.selected = true;
      this.selected.add(cell);
    }
  }

  /**
   * Find a cell for the screen coordinates.
   * 
   * @param {number} screenX 
   * @param {number} screenY
   * @returns {HexaCell}
   */
  fromCoords(screenX, screenY) {
    let x = Math.round((screenX - this.xShift) / 1.5 / this.r / 2);
    let y = Math.round((screenY - this.yShift) / this.h);

    if (y % 2 == 1) x--;

    let foundCell = null;
    let minDist = 1e10;
    const size = 2;
    for (let xc = x - size; xc <= x + size; xc++) {
      for (let yc = y - size; yc <= y + size; yc++) {
        if (xc >= 0 && xc < this.width && yc >= 0 && yc < this.height) {
          let cell = this.cells[xc][yc];
          let dist = Math.sqrt(Math.pow(screenX - cell.xc, 2) + Math.pow(screenY - cell.yc, 2));
          if (dist < minDist) {
            minDist = dist;
            foundCell = cell;
          }
        }
      }
    }

    return foundCell;
  }

  shift(dx, dy) {
    this.xShift += dx;
    this.yShift += dy;
  }
}

class SinkNode extends AbstractNode {
  /**
   * @param {Sink} sink
   */
  constructor(sink) {
    super();

    this.sink = sink;
  }

  draw(ctx) {
    const xc = this.sink.hexaCell.xc;
    const yc = this.sink.hexaCell.yc;

    ctx.strokeStyle = "#cccccc";
    ctx.strokeRect(xc - 5, yc - 5, 10, 10);

    ctx.font = "16px serif";
    ctx.fillText(this.sink.thingsSinked.toString(), xc + 10, yc + 10);
  }
}

class ABRouterNode extends AbstractNode {
  constructor(abRouter) {
    super();

    this.abRouter = abRouter;
  }

  draw(ctx) {
    const xc = this.abRouter.hexaCell.xc;
    const yc = this.abRouter.hexaCell.yc;

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(xc + 4, yc);
    ctx.lineTo(xc, yc);
    ctx.lineTo(xc - 4, yc - 4);
    ctx.moveTo(xc, yc);
    ctx.lineTo(xc - 4, yc + 4);
    ctx.stroke();
  }
}

class RoundRobinRouterNode extends AbstractNode {
  constructor(router) {
    super();

    this.router = router;
  }

  draw(ctx) {
    const xc = this.router.hexaCell.xc;
    const yc = this.router.hexaCell.yc;

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(xc + 4, yc);
    ctx.lineTo(xc, yc);
    ctx.lineTo(xc - 4, yc - 4);
    ctx.moveTo(xc, yc);
    ctx.lineTo(xc - 4, yc + 4);
    ctx.stroke();

    ctx.strokeStyle = "#999999";
    ctx.beginPath();
    ctx.arc(xc, yc, 10, 0, Math.PI * 2);
    ctx.stroke();

    this.__markOutput(ctx, this.router._idx);
  }
}

class SeparatorRouterNode extends AbstractNode {
  constructor(router) {
    super();

    this.router = router;
  }

  draw(ctx) {
    const xc = this.router.hexaCell.xc;
    const yc = this.router.hexaCell.yc;

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(xc + 4, yc);
    ctx.lineTo(xc, yc);
    ctx.lineTo(xc - 4, yc - 4);
    ctx.moveTo(xc, yc);
    ctx.lineTo(xc - 4, yc + 4);
    ctx.stroke();

    this.__markFirstOutput(ctx);

    ctx.fillStyle = "#000000";
    ctx.font = "16px serif";
    ctx.fillText(this.router.thingId, xc - 4, yc - 4);
  }
}

class CountingRouterNode extends AbstractNode {
  constructor(router) {
    super();

    this.router = router;
  }

  draw(ctx) {
    const xc = this.router.hexaCell.xc;
    const yc = this.router.hexaCell.yc;

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(xc + 4, yc);
    ctx.lineTo(xc, yc);
    ctx.lineTo(xc - 4, yc - 4);
    ctx.moveTo(xc, yc);
    ctx.lineTo(xc - 4, yc + 4);
    ctx.stroke();

    this.__markFirstOutput(ctx);

    ctx.fillStyle = "#000000";
    ctx.font = "16px serif";
    ctx.fillText(this.router.counter, xc - 4, yc - 4);
  }
}

class DelayNode extends AbstractNode {
  constructor(delay) {
    super();

    this.delay = delay;
  }

  draw(ctx) {
    const cell = this.delay.hexaCell;

    ctx.strokeStyle = "#999999";
    ctx.beginPath();
    ctx.arc(cell.xc, cell.yc, 13, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const progress = this.delay.timerId !== null ? Timer.getProgress(this.delay.timerId) : 0;
    ctx.arc(cell.xc, cell.yc, 13, 0, progress * 2 * Math.PI);
    ctx.stroke();
  }
}