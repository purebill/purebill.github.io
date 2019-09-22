class AbstractNode {
  constructor(thing) {
    this.thing = thing;
    thing.onDestroy(() => this.destroy());
    Loop.add(this);
    this.__animations = [];
  }

  destroy() {
    Loop.remove(this);
    this.__animations.forEach(a => a.destroy());
  }

  draw(ctx) {
    throw new Error("draw() not implemented");
  }

  _animateLinear(from, to, periodMs, loop) {
    const a = new LinearAnimation(from, to, periodMs, loop);
    this.__animations.push(a);
    return a;
  }

  _animateSinus(amplitude, periodMs, loop) {
    const a = new SinusAnimation(amplitude, periodMs, loop);
    this.__animations.push(a);
    return a;
  }

  __markOutput(ctx, idx) {
    if (idx < this.thing._outputs.length && this.thing._outputs[idx] instanceof Transporter) {
      const cell1 = this.thing._outputs[idx].cells[0];
      const cell2 = this.thing._outputs[idx].cells[1];
      const x = (cell1.xc + cell2.xc) / 2;
      const y = (cell1.yc + cell2.yc) / 2;
      ctx.fillStyle = Theme.fg2;
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
    ctx.strokeStyle = Theme.fg3;//"#000000";
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
    super(powerSource);
  }

  draw(ctx) {
    ctx.fillStyle = "#006600";

    const x = this.thing.hexaCell.xc;
    const y = this.thing.hexaCell.yc;

    if (this.thing.isOn())
      ctx.fillRect(x - 5, y - 5, 10, 10);
    else {
      ctx.strokeStyle = "#006600";
      ctx.strokeRect(x - 5, y - 5, 10, 10);
    }

    ctx.font = "12px serif";
    ctx.fillStyle = "#000000";
    ctx.fillText(Math.round(this.thing.powerLeft) + " / " + this.thing.maxPower, x + 10, y + 10);
  }
}

class ThingSourceNode extends AbstractNode {
  constructor(/**@type {ThingSource} */ thingSource) {
    super(thingSource);
  }

  draw(ctx) {
    const x = this.thing.hexaCell.xc;
    const y = this.thing.hexaCell.yc;

    ctx.font = "16px serif";
    ctx.fillText(this.thing.thingId + ": " + this.thing.suply, x + 17, y + 10);

    AbstractNode.drawWaitingThings(this.thing, ctx, x, y);

    AbstractNode.drawTimeLock(this.thing.timeLock, ctx, x, y);
  }
}

class FacilityNode extends AbstractNode {
  constructor(/**@type {ConstructionFacility} */ facility) {
    super(facility);
  }

  draw(ctx) {
    const xc = this.thing.hexaCell.xc;
    const yc = this.thing.hexaCell.yc;

    let x = xc + 10;
    let y = yc - 10;
    ctx.font = "16px serif";

    ctx.fillStyle = Theme.fg2;
    ctx.textAlign = "center";
    let name = this.thing.name || this.thing.constructionPlans.toString();
    ctx.fillText(name, xc, yc + 23);

    for (let thing of this.thing.thingsBoxed) {
      ctx.fillStyle = Theme.fg2;
      ctx.fillText(thing.id, x, y);
      y -= 20;
    }

    AbstractNode.drawProgress(this.thing.readyBoxes, ctx, xc, yc);
    AbstractNode.drawWaitingThings(this.thing, ctx, xc, yc);
  }
}

class TransporterNode extends AbstractNode {
  constructor(/**@type {Transporter} */ transporter) {
    super(transporter);

    this.color = Theme.fg;
   
    const centerIdx = Math.round(transporter.cells.length / 2);
    this.centerCell = transporter.cells[centerIdx];
  }

  pointForProgress(progress) {
    let l = progress * this.thing.length;
    let accL = 0;
    let i;
    const points = this.thing.cells;
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
    const points = this.thing.cells;

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

    // Arrow
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

    // Things being transported
    for (let box of this.thing.timeLock.slots) {
      let p = this.pointForProgress(box.progress);

      let textPoint = {x: p.x + 10, y: p.y};

      ctx.strokeStyle = Theme.fg;
      ctx.fillStyle = Theme.fg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "16px serif";
      ctx.fillText(box.thing.id, textPoint.x, textPoint.y);
    }

    AbstractNode.drawWaitingThings(this.thing, ctx, this.centerCell.xc, this.centerCell.yc);
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
    this.type = "ground";

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
  add(thing, cellType) {
    this.things.push(thing);
    thing.hexaCells.add(this);
    if (cellType) {
      const oldType = this.type;
      this.type = cellType;
      thing.onDestroy(() => this.type = oldType);
    }
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

  _drawImage(ctx) {
    const w = 40;
    const h = 34;

    ctx.drawImage(Assets.get(this.type), this.xc - w/2, this.yc - h/2);
  }

  _hex(ctx) {
    const xc = this.xc;
    const yc = this.yc;
    const r = this.board.r;
    const h = this.board.h;
    const r2 = Math.round(r/2);

    ctx.beginPath();
    // ctx.arc(xc, yc, 3, 0, 2*Math.PI);
    ctx.moveTo(xc - r, yc);
    ctx.lineTo(xc - r2, yc - h);
    ctx.lineTo(xc + r2, yc - h);
    ctx.lineTo(xc + r, yc);
    ctx.lineTo(xc + r2, yc + h);
    ctx.lineTo(xc - r2, yc + h);
    ctx.lineTo(xc - r, yc);
  }

  draw(ctx) {
    this._drawImage(ctx);

    if (this.selected) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      this._hex(ctx);
      ctx.fill();
    }
    // else {
    //   ctx.strokeStyle = "#cccccc";
    //   this._hex(ctx);
    //   ctx.stroke();
    // }

    // ctx.fillStyle = Theme.fg;
    // ctx.font = "12px sefif";
    // let text = this.x + ", " + this.y;
    // let m = ctx.measureText(text);
    // ctx.fillText(text, this.xc - m.width / 2, this.yc + 6);
  }

  /**
   * @return {HexaCell} Left-up from the cell.
   */
  lu() {
    const y = this.y - 1;
    const x = this.x - 1 + this.y % 2;
    if (x >= 0 && y >= 0) return this.board.cells[x][y];
    return null;
  }

  /**
   * @return {HexaCell} Up from the cell.
   */
  u() {
    if (this.y > 1) return this.board.cells[this.x][this.y - 2];
    return null;
  }

  /**
   * @return {HexaCell} Right-up from the cell.
   */
  ru() {
    const x = this.x + this.y % 2;
    const y = this.y - 1;
    if (x >= this.board.width || y < 0) return null;
    return this.board.cells[x][y];
  }

  /**
   * @return {HexaCell} Right-down from the cell.
   */
  rd() {
    const x = this.x + this.y % 2;
    const y = this.y + 1;
    if (x >= this.board.width || y >= this.board.height) return null;
    return this.board.cells[x][y];
  }

  /**
   * @return {HexaCell} Down from the cell.
   */
  d() {
    if (this.y >= this.board.height - 2) return null;
    return this.board.cells[this.x][this.y + 2];
  }

  /**
   * @return {HexaCell} Left-down from the cell.
   */
  ld() {
    const y = this.y + 1;
    const x = this.x - 1 + this.y % 2;
    if (y < this.board.height && x >= 0) return this.board.cells[x][y];
    return null;
  }

  /**
   * @return {HexaCell[]}
   */
  neighbours() {
    if (this._neighboursCache) return this._neighboursCache;

    let a = [this.u(), this.ru(), this.rd(), this.d(), this.ld(), this.lu()]
        .filter(it => it !== null);

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
    this.h = Math.round(this.r * Math.sqrt(3) / 2);
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
    
        let yc = Math.round(y * h);
        let xc = Math.round(x * r * 3);
    
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

  add(x, y, thing, cellType) {
    assert(x >= 0 && x < this.width && y >= 0 && y < this.height);

    const cell = this.cells[x][y];
    cell.add(thing, cellType);
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
    super(sink);
    this.blurAnimation = this._animateSinus(5, 1000, true);
  }

  draw(ctx) {
    const xc = this.thing.hexaCell.xc;
    const yc = this.thing.hexaCell.yc;

    ctx.font = "16px serif";

    let chars = [];
    for (let [ch, count] of this.thing.charsSinked) {
      for (let i = 0; i < count; i++) chars.push(ch);
    }
    let x = xc + 16;
    for (let ch of this.thing.textToWait) {
      let idx = chars.indexOf(ch);
      if (idx != -1) {
        chars.splice(idx, 1);
        ctx.fillStyle = Theme.fg3;
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = Theme.fg;
        ctx.shadowBlur = this.blurAnimation.getValue();
        ctx.shadowColor = Theme.fg;
      }
      ctx.fillText(ch, x, yc + 10);

      let m = ctx.measureText(ch);
      x += m.width;
    }
  }
}

class ABRouterNode extends AbstractNode {
  constructor(abRouter) {
    super(abRouter);
  }

  draw(ctx) {
    const xc = this.thing.hexaCell.xc;
    const yc = this.thing.hexaCell.yc;

    ctx.strokeStyle = Theme.fg;
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
    super(router);
  }

  draw(ctx) {
    this.__markOutput(ctx, this.thing._idx);
  }
}

class SeparatorRouterNode extends AbstractNode {
  constructor(router) {
    super(router);
  }

  draw(ctx) {
    const xc = this.thing.hexaCell.xc;
    const yc = this.thing.hexaCell.yc;

    this.__markFirstOutput(ctx);

    ctx.fillStyle = Theme.fg2;
    ctx.font = "16px serif";
    ctx.fillText(this.thing.thingId, xc + 4, yc - 4);
  }
}

class CountingRouterNode extends AbstractNode {
  constructor(router) {
    super(router);
  }

  draw(ctx) {
    const xc = this.thing.hexaCell.xc;
    const yc = this.thing.hexaCell.yc;

    this.__markFirstOutput(ctx);

    ctx.fillStyle = Theme.fg2;
    ctx.font = "16px serif";
    ctx.fillText(this.thing.counter, xc + 4, yc - 4);
  }
}

class DelayNode extends AbstractNode {
  constructor(delay) {
    super(delay);
  }

  draw(ctx) {
    const cell = this.thing.hexaCell;

    ctx.strokeStyle = Theme.fg3;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const progress = this.thing.timerId !== null ? Timer.getProgress(this.thing.timerId) : 0;
    ctx.arc(cell.xc, cell.yc, 17, 0, progress * 2 * Math.PI);
    ctx.stroke();
  }
}

class Cursor {
  /**
   * @param {string[]} imageNames 
   * @param {number[]} times 
   */
  constructor(imageNames, times, hotspotX, hotspotY) {
    this.imageNames = imageNames;
    this.times = times;
    this.hotspotX = hotspotX;
    this.hotspotY = hotspotY;
    this.imageIdx = 0;
    this.stopped = false;
  }

  animate() {
    if (this.imageNames.length <= 1) return;
    this.stopped = false;

    Timer.set(() => {
      this.imageIdx = (this.imageIdx + 1) % this.imageNames.length;
      if (!this.stopped) this.animate();
    }, this.times[this.imageIdx]);
  }

  stop() {
    this.stopped = true;
  }

  draw(ctx, x ,y) {
    ctx.drawImage(Assets.get(this.imageNames[this.imageIdx]), x - this.hotspotX, y - this.hotspotY);
  }
}

class Animation {
  constructor() {
    this._timerId = null;
  }

  destroy() {
    if (this._timerId) {
      Timer.clear(this._timerId);
      this._timerId = null;
    }
  }

  getValue() {
    throw new Error("Not implemented");
  }
}

class LinearAnimation extends Animation {
  constructor(from, to, periodMs, loop) {
    super();
    this.from = from;
    this.to = to;
    this.periodMs = periodMs;
    this.loop = loop;
    this.__initTimer();
  }

  __initTimer() {
    this._timerId = Timer.set(() => {
      if (!this.loop) return;
      [this.from, this.to] = [this.to, this.from];
      this.__initTimer();
    }, this.periodMs);
  }

  getValue() {
    return this.from + (this.to - this.from) * Timer.getProgress(this._timerId);
  }
}

class SinusAnimation extends Animation {
  constructor(amplitude, periodMs, loop) {
    super();
    this.amplitude = amplitude;
    this.periodMs = periodMs;
    this.loop = loop;
    this.__initTimer();
  }

  __initTimer() {
    this._timerId = Timer.set(() => this.loop && this.__initTimer(), this.periodMs);
  }

  getValue() {
    return this.amplitude * (1 + Math.sin(Math.PI * 2 * Timer.getProgress(this._timerId))) / 2;
  }
}