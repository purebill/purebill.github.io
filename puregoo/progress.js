export class Phase {
  totalAmount = 0;
  doneAmount = 0;

  constructor(name) {
    this.name = name;
  }

  done(amount) {
    this.doneAmount += amount;
  }

  add(amount) {
    this.totalAmount += amount;
  }

  stop() {
    this.doneAmount = this.totalAmount;
  }
}

export class Progress {
  div = null;
  timerId = null;
  
  /**@type {Map<String, Phase>} */
  phases = new Map();

  /**
   * @param {HTMLElement} div 
   */
  constructor(div) {
    this.div = div;
  }

  /**
   * @param {string} name 
   * @returns {Phase}
   */
  phase(name) {
    if (this.timerId == null) throw new Error("Progress is not started");

    if (!this.phases.has(name)) {
      const phase = new Phase(name);
      this.phases.set(name, phase);
    }

    return this.phases.get(name);
  }

  /**
   * @param {string[]} names
   */
  start(...names) {
    if (this.timerId != null) stop();

    this.phases = new Map();
    names.forEach(this.phase.bind(this));

    this.timerId = window.setInterval(() => {
      const perPhase = 100 / this.phases.size;
      let percent = [...this.phases.values()]
        .map(p => p.totalAmount > 0 ? p.doneAmount/p.totalAmount*perPhase : 0)
        .reduce((a, v) => a+v, 0);
      this.div.style.display = "block";
      this.div.innerText = Math.min(100, percent).toFixed(0) + "%";
    }, 500);
  }

  stop() {
    if (this.timerId == null) return;
  
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.div.style.display = "none";
  }
}

Progress.NOOP = new Phase("NOOP");