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

  isInbetween() {
    return this.kind === Kind.inbetween;
  }

  toString() {
    if (this.isOk()) return `[Parsed(${this.cb.idx} of ${this.cb.buffer.size}): ${this.value}]`;
    if (this.isFailure()) return `[Failure(${this.cb.idx} of ${this.cb.buffer.size}): ${this.reason}]`;
    else return `[Inbetween(${this.cb.idx} of ${this.cb.buffer.size})]`;
  }
}

class ParseFailure extends Error {
  constructor(message) {
    super(message);
  }
}

class PartuallyParsedFailure extends ParseFailure {
  constructor(message) {
    super(message);
  }
}

class Parser {
  /**
   * @param {string} name 
   */
  constructor(name) {
    this.name = name;
    this.reason = "[unknow reason]";
  }

  /**
   * @param {RingBuffer} buffer
   * @param {boolean=} partually
   */
  parse(buffer, partually) {
    let cb = new ConsumedBuffer(buffer);
    let state = new ParserState(cb);
    this._parse(state);
    if (state.isOk()) {
      if (partually || cb.atEnd()) return state.value;
      else throw new PartuallyParsedFailure("Partually consumed: " + state.toString());
    }
    else if (state.isInbetween()) return undefined;
    else throw new ParseFailure("Failed: " + (state.reason !== undefined ? state.reason : this.reason));
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    throw new Error("Unimplemented");
  }
}

class ConditionParser extends Parser {
  /**
   * @param {(o: object) => boolean} condition
   * @param {string} name
   */
  constructor(condition, name) {
    super(`[cond: ${name}]`);
    this.condition = condition;
    this.reason = name + " not found";
  }
  
  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    if (state.cb.atEnd()) {
      state.kind = Kind.failure;
      state.reason = "end reached";
      return;
    }

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

class ManyParser extends Parser {
  /**
   * @param {Parser} parser 
   */
  constructor(parser, from, to) {
    from = from !== undefined ? from : 1;
    to = to !== undefined ? to : Infinity;
    if (from > to) throw new Error("to < from");
    super(`[many: ${parser.name}{${from}, ${to}}]`);
    
    this.parser = parser;
    this.from = from;
    this.to = to;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    let values = [];
    let startIdx = state.cb.idx;
    for (let c = 0;; c++) {
      if (c >= this.to) {
        state.kind = Kind.ok;
        state.value = values;
        return;
      }

      let {cb: {idx}} = state;
      this.parser._parse(state);

      if (state.isFailure() || state.isInbetween()) {
        if (c < this.from) {
          state.cb.idx = startIdx;
          state.kind = Kind.failure;
          state.reason = `Expecting at least ${this.from} of ${this.parser.name}`;
          return;
        }

        state.cb.idx = idx;
        state.kind = Kind.ok;
        state.value = values;
        return;
      }

      values.push(state.value);
    }
  }
}

class SequenceParser extends Parser {
  constructor(...parsers) {
    super("[seq: " + parsers.map(p => p.name).join(", ") + "]");
    this.parsers = parsers;
  }

  
  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    let idx = state.cb.idx;
    let values = [];
    let consumed = [];
    for (let p of this.parsers) {
      let {cb: {idx}} = state;
      p._parse(state);
      
      if (state.isOk()) {
        consumed.push(p.name);
        values.push(state.value);
        continue;
      }

      state.cb.idx = idx;
      state.kind = Kind.failure;
      state.reason = "Expecting " + this.name + " but found only [" + consumed.join(", ") + "]";
      state.cb.idx = idx;
      return;
    }

    state.kind = Kind.ok;
    state.value = values;
  }
}

class OrParser extends Parser {
  constructor(...parsers) {
    super("[or: " + parsers.map(p => p.name).join(", ") + "]");
    this.parsers = parsers;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    let idx = state.cb.idx;
    for (let p of this.parsers) {
      let {cb: {idx}} = state;
      p._parse(state);
      
      if (state.isOk()) return;
      state.cb.idx = idx;
    }

    state.kind = Kind.failure;
    state.reason = "Expecting " + this.name;
    state.cb.idx = idx;
  }
}

class MappingParser extends Parser {
  constructor(mapper, parser) {
    super("[map: " + parser.name + "]");
    this.mapper = mapper;
    this.parser = parser;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    this.parser._parse(state);
    if (state.isOk()) state.value = this.mapper(state.value);
  }
}

class LaterParser extends Parser {
  constructor() {
    super("[later]");
    this.parser = null;
  }

  init(parser) {
    if (this.parser !== null) throw new Error("Already initialized");
    this.parser = parser;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    if (this.parser === null) throw new Error("Not initialized");
    this.parser._parse(state);
  }
}

class PositionParser extends Parser {
  constructor(parser) {
    super("[position]");
    this.parser = parser;
  }

  /**
   * @param {ParserState} state 
   */
  _parse(state) {
    this.parser._parse(state);
    if (state.isOk()) {
      state.kind = Kind.ok;
      state.value = [state.value, state.cb.idx];
      return;
    }
  }
}

const P = {};

P.cond = (condition, name) => new ConditionParser(condition, name);
P.or = (...alternatives) => new OrParser(...alternatives);
P.seq = (...steps) => new SequenceParser(...steps);
P.many = (parser, from, to) => new ManyParser(parser, from, to);
P.any = () => new ConditionParser(v => true, "any");
P.map = (mapper, parser) => new MappingParser(mapper, parser);
P.pos = (parser) => new PositionParser(parser);


// let rb = new RingBuffer(10);
// rb.push(2, 4, 7, 6, "a");

// let result = P.many(
//   P.seq(
//     P.many(
//       P.or(
//         P.map(v => "even pos: " + v[1],
//           P.pos(
//             P.cond(v => v%2 == 0, "even"))),
//         P.map(v => "seven pos: " + v[1],
//           P.pos(
//             P.cond(v => v == 7, "7")))
//       )
//     ),
//     P.many(
//       P.cond(v => v == "a")
//     )
//   ),
//   0,
//   10
// )
// // let result = C.seq(
// //   C.or(
// //     C.cond(v => v%2 == 0, "even").pipe(C.pos()).pipe(C.map(v => "even pos: " + v[1])),
// //     C.cond(v => v == 7, "7").pipe(C.pos()).pipe(C.map(v => "seven pos: " + v[1])),
// //   )
// //     .pipe(C.many()),
// //   C.cond(v => v == "a").pipe(C.many())
// // )
// // .pipe(C.map(v => "(" + v.join("), (") + ")"))
// // .pipe(C.many(0, 10))
// .parse(rb, true);

// console.log(result);