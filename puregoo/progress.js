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

const div = document.getElementById("progress");
let timerId = null;

/**@type {Map<String, Phase} */
let phases = new Map();
// let totalAmount = 0;
// let doneAmount = 0;

/**
 * @param {string} name 
 * @returns {Phase}
 */
function phase(name) {
  if (timerId == null) throw new Error("Progress is not started");

  if (!phases.has(name)) {
    const phase = new Phase(name);
    phases.set(name, phase);
  }

  return phases.get(name);
}

/**
 * @param {string[]} names
 */
function start(...names) {
  if (timerId != null) stop();

  phases = new Map();
  names.forEach(phase);

  timerId = window.setInterval(() => {
    const perPhase = 100 / phases.size;
    let percent = [...phases.values()]
      .map(p => p.totalAmount > 0 ? p.doneAmount/p.totalAmount*perPhase : 0)
      .reduce((a, v) => a+v, 0);
    div.style.display = "block";
    div.innerText = Math.min(100, percent).toFixed(0) + "%";
  }, 500);
}

function add(amount, name) {
  phase(name).add(amount);
}

function done(amount, name) {
  phase(name).done(amount);
}

function stop() {
  if (timerId == null) return;

  window.clearInterval(timerId);
  timerId = null;
  div.style.display = "none";
}

const NOOP = new Phase("NOOP");

export const Progress = {
  start,
  phase,
  stop,
  NOOP
};