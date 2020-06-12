class Detector {
  constructor(size, ...checks) {
    this.history = new RingBuffer(size);
    this.checks = checks;
  }

  /**
   * @param {(history: RingBuffer) => void} check 
   */
  addCheck(check) {
    this.checks.push(check);
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
}