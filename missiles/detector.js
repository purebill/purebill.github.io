import { RingBuffer } from "./ring-buffer.js";
import V from "./vector.js";
import { TelemetryCollector } from "./telemetry.js";

export class Detector {
  constructor(size, ...checks) {
    this.history = new RingBuffer(size);
    this.checks = checks;
    this.steps = [];
    this.lastPlaneState = null;
  }

  /**
   * @param {(history: RingBuffer) => void} check 
   */
  addCheck(check) {
    this.checks.push(check);
  }

  /**
   * @param {(sample: any) => void} step 
   */
  addStep(step) {
    this.steps.push(step);
  }

  /**
   * @param {TelemetryCollector} telemetry 
   */
  detect(telemetry) {
    if (telemetry.planeState.size > 0) {
      telemetry.planeState.forEach((p, i) => {
        const m = telemetry.missileState.get(i);
        
        const dist = V.length(V.subtract(p.xy, m.xy));
        const angle = V.angle(p.v, m.v);
        const sameDir = Math.sign(V.dotProduct(p.v, m.v)) >= 0;
        const behind = V.behind(m.v, m.xy, p.xy);
        const missileIsDead = m.lastMissileIsDead;

        this.history.push({t: p.t, dist, angle, sameDir, behind, missileIsDead});
      });

      this.checks.forEach(it => it(this.history));
    }
  }

  step(telemetry) {
    if (telemetry.planeState.size > 0) {
      const p = telemetry.getLatestPlaneState();
      const m = telemetry.getLatestMissileState();
      
      if (this.lastPlaneState === p) return;
      this.lastPlaneState = p;
      
      const dist = V.length(V.subtract(p.xy, m.xy));
      const angle = V.angle(p.v, m.v);
      const sameDir = Math.sign(V.dotProduct(p.v, m.v)) >= 0;
      const behind = V.behind(m.v, m.xy, p.xy);
      const missileIsDead = m.lastMissileIsDead;

      let sample = {t: p.t, dist, angle, sameDir, behind, missileIsDead};
      this.steps.forEach(it => it(sample));
    }
  }
}