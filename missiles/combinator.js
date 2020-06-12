class Combinator {
  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    return this;
  }

  /**
   * @return {Parser}
   */
  toParser() {
    return null;
  }
}

class TerminalCombinator extends Combinator {
  /**
   * @param {Parser} parser 
   */
  constructor(parser) {
    super();
    this.parser = parser;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    throw new Error("Can't apply terminal combinator");
  }

  /**
   * @return {Parser}
   */
  toParser() {
    return this.parser;
  }
}

class DelayedCombinator extends Combinator {
  /**
   * 
   * @param {() => Parser} toParserF 
   * @param {((Combinator) => Combinator)=} applyF 
   */
  constructor(toParserF, applyF) {
    super();
    this.toParserF = toParserF;
    this.applyF = applyF;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    if (this.applyF === undefined) throw new Error("Can't apply");
    return this.applyF(c);
  }

  /**
   * @return {Parser}
   */
  toParser() {
    if (this.toParserF === undefined) throw new Error("Can't toParser");
    return this.toParserF();
  }
}

class MappingCombinator extends Combinator {
  constructor(mapper) {
    super();
    this.mapper = mapper;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    return new DelayedCombinator(() => new MappingParser(this.mapper, c.toParser()));
  }

  /**
   * @return {Parser}
   */
  toParser() {
    throw new Error("Can't call");
  }
}

class PositionCombinator extends Combinator {
  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    return new DelayedCombinator(() => new PositionParser(c.toParser()));
  }

  /**
   * @return {Parser}
   */
  toParser() {
    throw new Error("Can't call");
  }
}

class OrCombinator extends Combinator {
  constructor(...alternatives) {
    super();
    this.alternatives = alternatives;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    throw new Error("Can't apply");
  }

  /**
   * @return {Parser}
   */
  toParser() {
    return new OrParser(...this.alternatives.map(it => it.toParser()));
  }
}

class ManyCombinator extends Combinator {
  constructor(from, to) {
    super();
    this.from = from;
    this.to = to;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    return new DelayedCombinator(() => new ManyParser(c.toParser(), this.from, this.to));
  }

  /**
   * @return {Parser}
   */
  toParser() {
    throw new Error("Can't toParser");
  }
}

class SequenceCombinator extends Combinator {
  constructor(...steps) {
    super();
    this.steps = steps;
  }

  /**
   * @param {Combinator} c 
   * @return {Combinator}
   */
  apply(c) {
    throw new Error("Can't apply");
  }

  /**
   * @return {Parser}
   */
  toParser() {
    return new SequenceParser(...this.steps.map(it => it.toParser()));
  }
}

class C {
  /**
   * @param {Combinator} combinator
   */
  constructor(combinator) {
    this.combinator = combinator;
  }

  /**
   * @param {C} c
   * @return {C}
   */
  pipe(c) {
    return new C(c.combinator.apply(this.combinator));
  }

  /**
   * @param {RingBuffer} buffer
   * @param {boolean=} partually
   */
  parse(buffer, partually) {
    return this.combinator.toParser().parse(buffer, partually);
  }
}

C.cond = (condition, name) => new C(new TerminalCombinator(new ConditionParser(condition, name)));
C.map = (mapper) => new C(new MappingCombinator(mapper));
C.or = (...alternatives) => new C(new OrCombinator(...alternatives.map(it => it.combinator)));
C.many = (from, to) => new C(new ManyCombinator(from, to));
C.seq = (...steps) => new C(new SequenceCombinator(...steps.map(it => it.combinator)));
C.any = () => C.cond(v => true, "any");
C.pos = () => new C(new PositionCombinator());


// let rb = new RingBuffer(10);
// rb.push(2, 4, 7, 6, "a");
// let result = C.seq(
//   C.or(
//     C.cond(v => v%2 == 0, "even").pipe(C.pos()).pipe(C.map(v => "even pos: " + v[1])),
//     C.cond(v => v == 7, "7").pipe(C.pos()).pipe(C.map(v => "seven pos: " + v[1])),
//   )
//     .pipe(C.many()),
//   C.cond(v => v == "a").pipe(C.many())
// )
// .pipe(C.map(v => "(" + v.join("), (") + ")"))
// .pipe(C.many(0, 10))
// .parse(rb, true);

// console.log(result);