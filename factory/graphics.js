class AbstractNode {
  constructor() {
    this.x = undefined;
    this.y = undefined;
  }

  destroy() {
    Loop.remove(this);
    console.log("[Node]", "destroyed", this);
  }

  draw(ctx) {
    throw new Error("draw() not implemented");
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
    const r = 10;
    const space = 5;

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + r + space, y + r, r, 0, 2 * Math.PI * box.progress);
    ctx.stroke();
  }

  static drawTimeLock(timeLock, ctx, x, y) {
    const r = 10;

    for (let i = 0; i < timeLock.slots.length; i++) {
      AbstractNode.drawProgress(timeLock.slots[i], ctx, x + (2*r+5)*(i+1), y + 20);
    }
  }
}

class PowerSourceNode extends AbstractNode {
  constructor(powerSource, x, y) {
    super();

    this.powerSource = powerSource;
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    ctx.fillStyle = "#006600";

    if (this.powerSource.isOn())
      ctx.fillRect(this.x - 5, this.y - 5, 10, 10);
    else {
      ctx.strokeStyle = "#006600";
      ctx.strokeRect(this.x - 5, this.y - 5, 10, 10);
    }

    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(Math.round(this.powerSource.powerLeft) + " / " + this.powerSource.maxPower, this.x + 10, this.y + 10);

    for (let box of this.powerSource.consumers) {
      if (this.powerSource.isOn()) ctx.strokeStyle = "rgba(0, 100, 0, .2)";
      else ctx.strokeStyle = "rgba(255, 0, 0, .2)";
      
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(box.consumer.node.x, box.consumer.node.y);
      ctx.stroke();
    }
  }
}

class ThingSourceNode extends AbstractNode {
  constructor(thingSource, x, y) {
    super();

    this.thingSource = thingSource;
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    ctx.fillStyle = "#0000ff";
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10);

    ctx.font = "16px serif";
    ctx.fillText(this.thingSource.thingId + ": " + this.thingSource.suply, this.x + 10, this.y + 10);

    AbstractNode.drawWaitingThings(this.thingSource, ctx, this.x, this.y);

    AbstractNode.drawTimeLock(this.thingSource.timeLock, ctx, this.x, this.y);
  }
}

class FacilityNode extends AbstractNode {
  constructor(facility, x, y) {
    super();

    this.facility = facility;
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10);

    let x = this.x + 10;
    let y = this.y - 10;
    ctx.font = "16px serif";
    for (let box of this.facility.boxes) {
      for (let k of box.slots.keys()) {
        box.slots.get(k).forEach(id => {
          if (id === null) ctx.fillStyle = "#cccccc";
          else ctx.fillStyle = "#000000";

          ctx.fillText(k, x, y);

          y -= 15;
        });
      }

      if (box.timeLockBox) AbstractNode.drawProgress(box.timeLockBox, ctx, x - 30, y + 10);

      y -= 5;
    }

    AbstractNode.drawWaitingThings(this.facility, ctx, this.x, this.y);
  }
}

class TransporterNode extends AbstractNode {
  constructor(transporter, points) {
    super();

    this.color = "#000000";
    this.points = points;
    
    let totalLength = 0;
    points[0].length = 0;
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      const prev = points[i-1];
      let length = Math.sqrt(Math.pow(point.x - prev.x, 2) + Math.pow(point.y - prev.y, 2));
      totalLength += length;
      point.length = length;
    }
    transporter.length = totalLength;

    this.transporter = transporter;

    let p = this.pointForProgress(0.5);
    this.x = p.x;
    this.y = p.y;

    this.start = Timer.now();
  }

  pointForProgress(progress) {
    let l = progress * this.transporter.length;
    let accL = 0;
    let i = 0;
    for (i = 1; i < this.points.length; i++) {
      const point = this.points[i];
      accL += point.length;
      if (accL >= l) {
        progress = 1 - (accL - l) / point.length;
        break;
      }
    }

    let x = this.points[i - 1].x + (this.points[i].x - this.points[i - 1].x) * progress;
    let y = this.points[i - 1].y + (this.points[i].y - this.points[i - 1].y) * progress;

    return {x, y};
  }

  draw(ctx) {
    if (this.points.length < 2) return;

    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    this.points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

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

    AbstractNode.drawWaitingThings(this.transporter, ctx, this.x, this.y);
  }
}

class HexaCell {
  constructor(x, y, board, xc, yc) {
    this.x = x;
    this.y = y;
    this.xc = xc;
    this.yc = yc;
    this.board = board;
    this.selected = false;
    this.things = [];
  }

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
    ctx.lineTo(xc - r, yc);
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
          a.push(b[this.x][this.y + 1])
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

    return a;
  }
}

class HexaBoard {
  constructor(width, height) {
    this.selectedCell = null;
    this.width = width;
    this.height = height;
    this.r = 20;
    this.h = this.r * Math.sqrt(3) / 2;
    this.xShift = 2*this.r;
    this.yShift = 2*this.r;
    this.selected = new Set();

    /**@type {HexaCell[][]} */
    this.cells = [];
    for (let x = 0; x < width; x++) {
      this.cells[x] = [];
      for (let y = 0; y < height; y++) {
        const xx = this.xShift;
        const yy = this.yShift;
        const r = this.r;
        const h = this.h;
    
        let yc = yy + y * h;
        let xc = xx + x * r * 3;
    
        if (y % 2 == 1) {
          xc += 1.5*r;
        }
    
        this.cells[x][y] = new HexaCell(x, y, this, xc, yc);
      }
    }
  }

  add(x, y, thing) {
    assert(x >= 0 && x < this.width && y >= 0 && y < this.height);

    const cell = this.cells[x][y];
    cell.add(thing);
    return cell;
  }

  draw(ctx) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
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
}

class SinkNode extends AbstractNode {
  /**
   * @param {Sink} sink
   * @param {number} x
   * @param {number} y
   */
  constructor(sink, x, y) {
    super();

    this.sink = sink;
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    ctx.strokeStyle = "#cccccc";
    ctx.strokeRect(this.x - 5, this.y - 5, 10, 10);

    ctx.font = "16px serif";
    ctx.fillText(this.sink.thingsSinked, this.x + 10, this.y + 10);
  }
}

class ABRouterNode extends AbstractNode {
  constructor(abRouter, x, y) {
    super();

    this.abRouter = abRouter;
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(this.x + 4, this.y);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(this.x - 4, this.y - 4);
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - 4, this.y + 4);
    ctx.stroke();
  }
}