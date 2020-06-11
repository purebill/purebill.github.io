class TelemetryCollector {
  /**
   * @param {number} interval
   * @param {Game} game
   */
  constructor(interval, game, capacity) {
    this.interval = interval;
    this.lastTime = 0;
    this.time = 0;
    this.game = game;
    this.capacity = capacity;
    this.planeState = new RingBuffer(this.capacity);
    this.missileState = new RingBuffer(this.capacity);
    this.lastClosestMissile = null;
  }

  toTrigger() {
    return dt => this.progress(dt);
  }

  progress(dt) {
    this.time += dt;
    if (this.time - this.lastTime >= this.interval) {
      this.lastTime = this.time;
      this._collect();
    }
  }

  _collect() {
    let minDist2 = 1e20;
    let closestMissile = null;
    const p = this.game.plane;
    for (let m of this.game.flies) {
      if (m instanceof Missile) {
        const dx = p.xy[0] - m.xy[0];
        const dy = p.xy[1] - m.xy[1];
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist2) {
          minDist2 = dist2;
          closestMissile = m;
        }
      }
    }

    let lastMissileIsDead = false;
    if (this.lastClosestMissile !== closestMissile) {
      if (this.lastClosestMissile !== null) {
        // missile changed
        if (this.lastClosestMissile.dead) {
          lastMissileIsDead = true;
        }
      }
      this.lastClosestMissile = closestMissile;
    }

    this.planeState.push({t: this.time, xy: p.xy, v: V.normalize(p.v)});

    if (closestMissile !== null)
      this.missileState.push({t: this.time, xy: closestMissile.xy, v: V.normalize(closestMissile.v), lastMissileIsDead});
    else
      this.missileState.push({t: this.time, xy: [Infinity, Infinity], v: [0, 0], lastMissileIsDead});
  }
}

class RingBuffer {
  constructor(capacity) {
    this.buffer = new Array(capacity);
    this.startIdx = 0;
    this.endIdx = 0;
    this.size = 0;
  }

  get(i) {
    if (i >= this.size) return undefined;
    return this.buffer[(this.startIdx + i) % this.buffer.length];
  }

  set(i, v) {
    this.buffer[(this.startIdx + i) % this.buffer.length] = v;
  }

  push(v) {
    const l = this.buffer.length;
    if (this.size < l) {
      this.buffer[this.endIdx++] = v;
      this.size++;
    } else {
      this.buffer[this.startIdx] = v;
      this.startIdx = (this.startIdx + 1) % l;
    }
  }

  forEach(f) {
    for (let j = 0; j < this.size; j++) f(this.get(j), j);
  }

  toArray() {
    const array = new Array(this.size);
    this.forEach((v, idx) => array[idx] = v);
    return array;
  }
}

class Chart {
  constructor() {
    this.arrays = [];
    this.colors = [];
  }

  add(array, options) {
    array.options = Object.assign({
      color: "black",
      font: "12px serif",
      showValues: false,
      precision: 1,
      maxy: -Infinity,
      miny: Infinity
    }, options);

    if (array.length == 0 || this.arrays.length > 0 && this.arrays[0].length != array.length) throw new Error("Bad size");
    this.arrays.push(array);
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (this.arrays.length == 0) return;

    ctx.save();

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.strokeStyle = "gray";
    ctx.strokeRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let a of this.arrays) {
      let minx = Infinity, maxx = -Infinity, miny = a.options.miny, maxy = a.options.maxy;
      for (let xy of a) {
        const x = xy[0];
        const y = xy[1];
        if (Math.abs(x) != Infinity) {
          if (x < minx) minx = x;
          if (x > maxx) maxx = x;
        }
        if (Math.abs(y) != Infinity) {
          if (y < miny) miny = y;
          if (y > maxy) maxy = y;
        }
      }

      const dx = 20;
      const dy = 20;
      const w = ctx.canvas.width - 2*dx;
      const h = ctx.canvas.height - 2*dy;

      const xtos = x => {
        x = dx + (x - minx)/(maxx - minx)*w;
        if (x === Infinity) x = dx;
        if (x === -Infinity) x = w;
        return x;
      };

      const ytos = y => {
        y = dy + (y - miny)/(maxy - miny)*h;
        if (y === Infinity) y = h;
        if (y === -Infinity) y = dy;
        return y;
      };

      let x, y;
      ctx.strokeStyle = a.options.color;
      ctx.fillStyle = a.options.color;
      ctx.font = a.options.font;

      ctx.beginPath();
      ctx.moveTo(xtos(a[0][0]), ytos(a[0][1]));
      for (let i = 1; i < a.length; i++) {
        ctx.lineTo(xtos(a[i][0]), ytos(a[i][1]));
      }
      ctx.stroke();

      if (a.options.showValues) {
        ctx.fillText(a[0][1].toFixed(a.options.precision), xtos(a[0][0]), ytos(a[0][1]));
        ctx.fillText(a[a.length - 1][1].toFixed(a.options.precision), xtos(a[a.length - 1][0]), ytos(a[a.length - 1][1]));
        for (let i = 0; i < a.length; i++) {
          x = xtos(a[i][0]);
          const v = a[i][1];
          y = ytos(v);

          if (i > 0 && i < a.length - 1) {
            if (a[i - 1][1] < v && a[i + 1][1] < v
            || a[i - 1][1] > v && a[i + 1][1] > v) {
              ctx.fillText(v.toFixed(a.options.precision), x, y);
            }
          }
        }
      }
    }

    ctx.restore();
  }
}

function smooth(data, width) {
  const res = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < width || i >= data.length - width) {
      res[i] = data[i];
      continue;
    }
    let s = 0;
    for (let j = i - width; j < i + width; j++) {
      s += data[j][1];
    }
    res[i] = [data[i][0], s/(2*width + 1)];
  }
  return res;
}

GamePlugins.register(game => {
  const telemetryPerSecond = 5;
  let telemetry = new TelemetryCollector(1000/telemetryPerSecond, game, 10*telemetryPerSecond);
  game.addTrigger(telemetry.toTrigger());
  const detector = new Detector(game, 10*telemetryPerSecond);

  Timer.periodic(() => detector.detect(telemetry), 1000);
});

class Detector {
  /**
   * @param {Game} game 
   */
  constructor(game, size) {
    this.chartCanvas = document.createElement("canvas");
    this.chartCanvas.width = 300;
    this.chartCanvas.height = 300;
    this.history = new RingBuffer(size);
    game.addOverlay({
      drawPre: ctx => true,
      drawPost: ctx => ctx.drawImage(this.chartCanvas, 200, 200)
    });
  }

  /**
   * @param {TelemetryCollector} telemetry 
   */
  detect(telemetry) {
    const chart = new Chart();
    if (telemetry.planeState.size > 0) {
      let dists = new Array(telemetry.planeState.size);
      let angles = new Array(telemetry.planeState.size);
      telemetry.planeState.forEach((p, i) => {
        const m = telemetry.missileState.get(i);
        const dist = V.length(V.subtract(p.xy, m.xy));
        const angle = V.angle(p.v, m.v);

        dists[i] = [p.t, dist];
        angles[i] = [p.t, angle];
      });

      angles = smooth(angles, 2);

      const trigger = new Array(telemetry.planeState.size);
      telemetry.planeState.forEach((p, i) => {
        const m = telemetry.missileState.get(i);

        const angle = angles[i][1];
        const dist = dists[i][1];
        const sameDir = Math.sign(V.dotProduct(p.v, m.v)) >= 0;
        const behind = V.behind(m.v, m.xy, p.xy);
        const missileIsDead = m.lastMissileIsDead;

        this.history.push({dist, angle, sameDir, behind, missileIsDead});

        trigger[i] = [p.t, sameDir && dist < 100 && behind ? 1 : 0];
      });

      chart.add(dists, {color: "green", showValues: true});
      chart.add(angles, {color: "blue", showValues: true});
      chart.add(trigger, {color: "black", maxy: 1, miny: 0});
    }
    chart.draw(this.chartCanvas.getContext("2d"));
  }
}

class ConsumedBuffer {
  /**
   * @param {RingBuffer} buffer 
   */
  constructor(buffer) {
    this.buffer = buffer;
    this.idx = 0;
  }
}

const Kind = {};
Kind.ok = "ok";
Kind.inbetween = "inbetween";
Kind.failure = "failure";

class ParserState {
  /**
   * @param {ConsumedBuffer} cb 
   */
  constructor(cb) {
    this.cb = cb;
    this.value = undefined;
    this.kind = undefined;
    this.reason = undefined;
  }

  isOk() {
    return this.kind === Kind.ok;
  }

  isFailure() {
    return this.kind === Kind.failure;
  }

  inbetween() {
    return this.kind === Kind.inbetween;
  }

  toString() {
    if (this.isOk()) return `[Parsed: ${this.value}]`;
    if (this.isFailure()) return `[Failure: ${this.reason}]`;
    else return "[Inbetween parsing]";
  }
}

class ParseFailure extends Error {
  constructor(message) {
    super(message);
  }
}

class Parser {
  reason = "Unknow reason";

  /**
   * @param {RingBuffer} buffer
   */
  parse(buffer) {
    let cb = new ConsumedBuffer(buffer);
    let state = new ParserState(cb);
    this._parse(state);
    if (state.isOk()) {
      if (cb.idx == buffer.size) return state.value;
      else throw new ParseFailure("Partually consumed");
    }
    else if (state.inbetween()) return undefined;
    else throw new ParseFailure("Failed: " + (state.reason !== undefined ? state.reason : this.reason));
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    state.kind = Kind.failure;
  }
}

class ConditionParser extends Parser {
  /**
   * @param {(o: object) => boolean} condition
   * @param {string} reason
   */
  constructor(condition, reason) {
    super();
    this.condition = condition;
    this.reason = reason;
  }
  
  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    let value = state.cb.buffer.get(state.cb.idx);
    if (value !== undefined && this.condition(value)) {
      state.cb.idx++;
      state.value = value;
      state.kind = Kind.ok;
    } else {
      state.kind = Kind.failure;
    }
  }
}

class AsManyParser extends Parser {
  /**
   * @param {Parser} parser 
   */
  constructor(parser) {
    super();
    this.parser = parser;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    
  }
}

const Combinator = {};

/**
 * @param state {ParserState}
 * @return {Parser}
 */
Combinator.asMany = (state) => {
  return null;
};