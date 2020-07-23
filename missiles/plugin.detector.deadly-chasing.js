import { Game } from './game.js'
import GamePlugins from './plugins.js'
import { Detector } from './detector.js';
import { FsaBuilder } from './state-machine.js';
import { TelemetryCollector } from './telemetry.js';
import V from "./vector.js";

GamePlugins.register("detector-checks", [Detector, TelemetryCollector], (/**@type Game */ game, /**@type Detector */ detector, /**@type {TelemetryCollector} */ telemetry) => {
  const fsaCond = (s, c) => s.sameDir && s.dist < 100 && s.behind;
  const fsaNotCond = (s, c) => !fsaCond(s, c);
  const chasingThreshold = 3*T.telemetrySamplesPerSecond;
  const ratioThreshold = 1/2;
  let fsa = new FsaBuilder()
    .sampleFilter((s, c) => s.t > c.lastFsaTriggerTime)
    .state("start")
      .transition("start", fsaNotCond)
      .transition("chasing", fsaCond, (s, c) => c.chasingCount = 1)
    .state("chasing")
      .transition("chasing", fsaCond, (s, c) => c.chasingCount++)
      .transition("death", (s, c) => s.missileIsDead, (s, c) => c.deathTime = s.t)
      .transition("inbetween", (s, c) => c.chasingCount >= chasingThreshold, (s, c) => c.inbetweenCount = 1)
    .state("inbetween")
      .transition("death", (s, c) => c.inbetweenCount <= c.chasingCount * ratioThreshold && s.missileIsDead, (s, c) => c.deathTime = s.t)
      .transition("inbetween", (s, c) => c.inbetweenCount <= c.chasingCount * ratioThreshold && !s.missileIsDead, (s, c) => c.inbetweenCount++)
      .transition("failed")
    .build("start");
  // fsa.debug = true;

  class Context {
    constructor() {
      this.reset();
      this.lastFsaTriggerTime = 0;
    }

    reset() {
      this.stateReached = null;
      this.chasingCount = 0;
      this.deathTime = undefined;
    }
  }
  let context = new Context();

  function checkState() {
    if (context.stateReached == "failed") context.reset();
    if (context.chasingCount > chasingThreshold) game.addInfo("chasingCount", () => t`Chase it to death!`, 500);
    else game.removeInfo("chasingCount");
    if (context.deathTime !== undefined) {
      // fsa.debug = true; fsa.process(history, c); fsa.debug = false;
      game.addInfo("deadly chaser", t`Deadly chaser!`, 3000);
      game.plane.score += 10;
      context.lastFsaTriggerTime = context.deathTime;
      context.reset();
    }    
  }

  detector.addStep(sample => {
    let proceeded = fsa.step(sample, context);
    if (proceeded) {
      checkState();
    } else {
      context.reset();
    }
  });

  // detector.addCheck(history => {
  //   let nextIdx = 0;
  //   do {
  //     nextIdx = fsa.process(history, context, nextIdx);
  //     checkState();
  //   } while (nextIdx != -1);
  // });
});
