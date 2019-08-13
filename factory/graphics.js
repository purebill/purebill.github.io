class Node {
  draw(ctx) {
    throw new Error("draw() not implemented");
  }

  static drawProgress(box, ctx, x, y) {
    const r = 10;
    const space = 5;

    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.arc(x + r + space, y + r, r, 0, 2 * Math.PI * box.progress);
    ctx.stroke();
  }

  static drawTimeLock(timeLock, ctx, x, y) {
    const r = 10;
    const space = 5;

    for (let i = 0; i < timeLock.slots.length; i++) {
      Node.drawProgress(timeLock.slots[i], ctx, x + (2*r+5)*(i+1), y + 20);
    }
  }
}

class PowerSourceNode extends Node {
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
    ctx.fillText(this.powerSource.powerLeft + " / " + this.powerSource.maxPower, this.x + 10, this.y + 10);

    // if (this.powerSource.isOn()) ctx.strokeStyle = "rgba(0, 150, 0, .2)";
    // else ctx.strokeStyle = "rgba(255, 0, 0, .2)";
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

class ThingSourceNode extends Node {
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

    Node.drawTimeLock(this.thingSource.timeLock, ctx, this.x, this.y);
  }
}

class FacilityNode extends Node {
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

      if (box.timeLockBox) Node.drawProgress(box.timeLockBox, ctx, x + 20, y + 10);

      y -= 5;
    }
  }
}

class TransporterNode extends Node {
  constructor(transporter, x1, y1, x2, y2) {
    super();

    this.color = "#000000";
    this.x = (x1+x2)/2;
    this.y = (y1+y2)/2;
    this.points = [
      {x: x1, y: y1},
      {x: x2, y: y2}
    ];
    this.transporter = transporter;
  }

  draw(ctx) {
    if (this.points.length === 0) return;

    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    this.points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.stroke();

    this.transporter.timeLock.slots.forEach(box => {
      let x = this.points[0].x + (this.points[1].x - this.points[0].x) * box.progress;
      let y = this.points[0].y + (this.points[1].y - this.points[0].y) * box.progress;

      let textPoint = {x, y};
      if (this.points[0].x < this.points[1].x) textPoint.y += 10;
      else if (this.points[0].x > this.points[1].x) textPoint.y -= 10;

      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "16px serif";
      ctx.fillText(box.thing.id, textPoint.x, textPoint.y);
    });
  }
}