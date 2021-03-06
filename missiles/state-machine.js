import { RingBuffer, ConsumedBuffer } from "./ring-buffer.js";

export class FsaTransition {
  /**
   * @param {FsaState} toState
   * @param {(sample: any, context: object) => boolean} condition 
   * @param {((sample: any, context: object) => void)=} run 
   */
  constructor(toState, condition, run) {
    this._toState = toState;
    this._condition = condition;
    this._run = run;
  }

  transit(sample, context) {
    if (!this._condition || this._condition(sample, context)) {
      if (this._run) this._run(sample, context);
      return this._toState;
    }
    return null;
  }
}

export class FsaState {
  /**
   * @param {string} name
   * @param {FsaTransition[]} transitions 
   */
  constructor(name, transitions) {
    this.name = name;
    this.transitions = transitions;
  }
}

export class FsaContext {
  constructor() {
    this.stateReached = null;
  }
}

export class Fsa {
  /**
   * @param {FsaState} startState
   * @param {((sample: object, context: object) => boolean)=} sampleFilter
   */
  constructor(startState, sampleFilter) {
    this._startState = startState;
    this._sampleFilter = sampleFilter || null;
    this.debug = false;
  }

  /**
   * Consumes the buffer and returns back the index to start from next time (or -1).
   * 
   * Mutates context but setting the stateReached to the name of the state reached so far.
   * 
   * @param {RingBuffer} buffer
   * @param {object} context
   * @param {number=} startIdx
   * @return {number} index in the buffer to start from next time or -1 if processed 'till end of the buffer
   */
  process(buffer, context, startIdx) {
    startIdx = startIdx || 0;
    context.stateReached = null;
    let cb = new ConsumedBuffer(buffer, startIdx);
    context._state = this._startState;
    
    if (this.debug) console.groupCollapsed("FSA");
    if (this.debug) console.log("[start]", context._state.name);
    
    while(!cb.atEnd()) {
      let sample = cb.next();
      
      if (this._sampleFilter !== null && !this._sampleFilter(sample, context)) {
        if (this.debug) console.log("[skip sample]", sample);
        continue;
      }

      if (this.debug) console.log("[sample]", sample);

      let nextState = null;
      for (let t of context._state.transitions) {
        nextState = t.transit(sample, context);
        if (nextState !== null) {
          context.stateReached = nextState.name;
          if (this.debug) console.log("[transition]", state.name, " => ", nextState.name, "[context]", Object.assign({}, context));
          break;
        }
      }
      if (nextState === null) {
        if (this.debug) console.log("[end]", context._state, "[context]", Object.assign({}, context));
        break;
      }
      context._state = nextState;
    }

    if (this.debug) console.log("[buffer consumed]", cb.atEnd() ? "'till end" : "'till " + cb.idx);
    if (this.debug) console.groupEnd();

    return cb.atEnd() ? -1 : cb.idx;
  }

  /**
   * Make one step based on the sample.
   * 
   * If there is a state to transfer to based on the current state and the sample then
   * mutates context but setting the stateReached to the name of the state reached so far and return true.
   * 
   * False is returned otherwise.
   * 
   * @param {any} sample 
   * @param {object} context 
   * @returns {boolean} wheather the step succeeded to find a next state
   */
  step(sample, context) {
    if (context._state === undefined) {
      context._state = this._startState;
    }

    if (this._sampleFilter !== null && !this._sampleFilter(sample, context)) {
      if (this.debug) console.log("[skip sample]", sample);
      return true;
    }

    if (this.debug) console.log("[sample]", sample);

    let nextState = null;
    for (let t of context._state.transitions) {
      nextState = t.transit(sample, context);
      if (nextState !== null) {
        context.stateReached = nextState.name;
        if (this.debug) console.log("[transition]", context._state.name, " => ", nextState.name, "[context]", Object.assign({}, context));
        context._state = nextState;
        return true;
      }
    }

    if (this.debug) console.log("[end]", context._state, "[context]", Object.assign({}, context));
    delete context._state;

    return false;
  }
}

export class FsaBuilder {
  constructor(name, parent) {
    this._name = name || null;
    /**@type {Map<string, FsaBuilder>} */
    this._builders = parent ? parent._builders : new Map();
    this._parent = parent || null;
    this._sampleFilter = parent ? parent._sampleFilter : null;
    this._transitions = [];
    this.fsaStartStateName = null;
    this.fsaState = null;
  }

  /**
   * @param {(sample: object, context: object) => boolean} sampleFilter 
   */
  sampleFilter(sampleFilter) {
    if (this._sampleFilter !== null) throw new Error("sampleFilter already set");
    this._sampleFilter = sampleFilter;
    return this;
  }

  /**
   * @param {string} toStateName 
   * @param {((sample: any, context: object) => boolean)=} condition 
   * @param {((sample: any, context: object) => void)=} run 
   * @return {FsaBuilder}
   */
  transition(toStateName, condition, run) {
    this.state(toStateName);
    this._transitions.push({toStateName, condition, run});
    return this;
  }

  /**
   * @param {string} name
   * @return {FsaBuilder}
   */
  state(name) {
    let builder = this._builders.get(name);
    if (builder === undefined) {
      builder = new FsaBuilder(name, this);
      this._builders.set(name, builder);
    }
    return builder;
  }

  /**
   * @param {string} startStateName
   * @return {Fsa}
   */
  build(startStateName) {
    /**@type {Map<string, FsaState>} */
    let states = new Map();
    for (let b of this._builders.values()) {
      if (!states.has(b._name)) {
        states.set(b._name, new FsaState(b._name, []));
      }
    }
    for (let b of this._builders.values()) {
      let state = states.get(b._name);
      if (state === undefined) throw new Error("Can't find state: " + b._name);
      for (let t of b._transitions) {
        let toState = states.get(t.toStateName);
        if (toState === undefined) throw new Error("Can't find state: " + t.toStateName);
        state.transitions.push(new FsaTransition(toState, t.condition, t.run));
      }
    }
    let startState = states.get(startStateName);
    if (startState === undefined) throw new Error("Can't find state: " + startStateName);
    return new Fsa(startState, this._sampleFilter);
  }
}

// let builder = new FsaBuilder()
// .state("start")
//   .transition("found", (sample, context) => sample % 2 == 0, (sample, context) => context.count++)
// .state("found")
//   .transition("found", (sample, context) => sample % 2 == 0, (sample, context) => context.count++)
//   .transition("end", (sample, context) => sample % 2 == 1);
// console.log(builder);
// let fsa = builder.build("start");
// console.log(fsa);

// let context = {count: 0};
// for (let sample of [2, 4, 6, 7, 3, 2, 2, 3]) {
//   let proceed = fsa.step(sample, context);
//   console.log(sample, proceed, context.stateReached);
// }

// let rb = new RingBuffer(10);
// rb.push(2, 4, 6, 7, 3);
// let context = {count: 0};
// fsa.process(rb, context);
// console.log("context", context);