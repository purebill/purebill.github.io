let Persister = (function () {
  function getType(thing) {
    return thing.__proto__.constructor.name;
  }
  
  function getStaticFunction(type, name) {
    return eval(type + "." + name);
  }

  const persisters = {
    "PowerSource": (x, y, thing) => {
      return {
        f: "buildPowerSource",
        args: [x, y, thing.maxPower]
      };
    },
    "ThingSource": (x, y, thing) => {
      return {
        f: "buildThingSource",
        args: [x, y, thing.thingId, thing.capacity, thing.msPerThing, thing.powerNeeded]
      };
    },
    "ConstructionFacility": (x, y, thing) => {
      let plans = thing.constructionPlans.map(it => it.asString()).join(" | ");
      return {
        f: "buildFacility",
        args: [x, y, plans, thing.capacity, thing.powerNeeded, thing.name]
      };
    },
    "Sink": (x, y, thing) => {
      return {
        f: "buildSink",
        args: [x, y, thing.textToWait]
      };
    },
    "RoundRobinRouter": (x, y, thing) => {
      return {
        f: "buildRoundRobinRouter",
        args: [x, y]
      };
    },
    "ABRouter": (x, y, thing) => {
      return {
        f: "buildABRouter",
        args: [x, y]
      };
    },
    "SeparatorRouter": (x, y, thing) => {
      return {
        f: "buildSeparator",
        args: [x, y, thing.thingId, thing.powerNeeded]
      };
    },
    "CountingRouter": (x, y, thing) => {
      return {
        f: "buildCountingRouter",
        args: [x, y, thing.count, thing.powerNeeded]
      };
    },
    "Delay": (x, y, thing) => {
      return {
        f: "buildDelay",
        args: [x, y, thing.delayMs, thing.powerNeeded]
      };
    },
    "Transporter": (x, y, thing) => {
      return {
        f: "buildTransporter",
        args: [
          thing.cells.map(cell => {
            return {x: cell.x, y: cell.y};
          })
        ]
      }
    }
  };

  function persist(state) {
    let snapshot = {
      level: state.level.__proto__.constructor.name,
      calls: [],
      connectionCalls: [],
      width:  state.board.width,
      height: state.board.height
    };

    let idx = 0;
    const persisted = new Map();
    for (let x = 0; x < state.board.width; x++) {
      for (let y = 0; y < state.board.height; y++) {
        for (let thing of state.board.cells[x][y].things) {
          const type = getType(thing);

          if (persisted.has(thing)) continue;
          persisted.set(thing, idx++);

          assert(persisters[type] !== undefined);
          let call = persisters[type](x, y, thing);
          call.name = thing.name;
          snapshot.calls.push(call);
        }
      }
    }

    const persistedTransports = new Set();
    for (let x = 0; x < state.board.width; x++) {
      for (let y = 0; y < state.board.height; y++) {
        for (let thing of state.board.cells[x][y].things) {
          if (!(thing instanceof InputOutput)) continue;

          if (persistedTransports.has(thing)) continue;
          persistedTransports.add(thing);

          for (let consumer of thing._outputs) {
            snapshot.connectionCalls.push({
              name: thing.name,
              f: "connectByIdx",
              args: [persisted.get(thing), persisted.get(consumer)]
            });
          }
        }
      }
    }
    
    return snapshot;
  }

  function restore(snapshot) {
    state.reset();

    const constructorFunction = eval(snapshot.level);
    const level = new constructorFunction();
    state.setLevel(level);

    state.board = new HexaBoard(snapshot.width, snapshot.height, state.canvas);
    Loop.add(state.board);

    let things = [];
    snapshot.calls.forEach(call => {
      let thing = window[call.f].apply(null, call.args);
      if (call.name) thing.name = call.name;
      things.push(thing);
    });

    snapshot.connectionCalls.forEach(call => {
      call.args.push(things);
      window[call.f].apply(null, call.args);
    });
  }

  return {
    persist,
    restore
  };
}) ();