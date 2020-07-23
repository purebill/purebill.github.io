import { Game } from "./game.js";
import { RingBuffer } from "./ring-buffer.js";
import { Missile } from "./model.js";
import V from "./vector.js";

export class TelemetryCollector {
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
        if (this.lastClosestMissile.isDying()) {
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

  getLatestPlaneState() {
    if (this.planeState.size > 0) return this.planeState.get(this.planeState.size - 1);
    return null;
  }

  getLatestMissileState() {
    if (this.missileState.size > 0) return this.missileState.get(this.missileState.size - 1);
    return null;
  }
}
