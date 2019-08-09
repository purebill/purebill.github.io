class Node {
  draw(ctx) {
    throw new Error("draw() not implemented");
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

    if (this.thingSource.timeLock.slots.length > 0) {
      ctx.beginPath();
      ctx.arc(this.x + 10, this.y + 20, 10, 0, 2 * Math.PI * this.thingSource.timeLock.slots[0].progress);
      ctx.stroke();
    }
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
  }
}

class TransporterNode extends Node {
  constructor(transporter, x1, y1, x2, y2) {
    super();

    this.color = "#000000";
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