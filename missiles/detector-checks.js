// GamePlugins.register(game => {
//   const fsaCond = (s, c) => s.sameDir && s.dist < 100 && s.behind;
//   const fsaNotCond = (s, c) => !fsaCond(s, c);
//   const chasingThreshold = 3*T.telemetrySamplesPerSecond;
//   const ratioThreshold = 1/2;
//   let fsa = new FsaBuilder()
//     .sampleFilter((s, c) => s.t > c.lastFsaTriggerTime)
//     .state("start")
//       .transition("start", fsaNotCond)
//       .transition("chasing", fsaCond, (s, c) => c.chasingCount = 1)
//     .state("chasing")
//       .transition("chasing", fsaCond, (s, c) => c.chasingCount++)
//       .transition("death", (s, c) => s.missileIsDead, (s, c) => c.deathTime = s.t)
//       .transition("inbetween", (s, c) => c.chasingCount >= chasingThreshold, (s, c) => c.inbetweenCount = 1)
//     .state("inbetween")
//       .transition("death", (s, c) => c.inbetweenCount <= c.chasingCount * ratioThreshold && s.missileIsDead, (s, c) => c.deathTime = s.t)
//       .transition("inbetween", (s, c) => c.inbetweenCount <= c.chasingCount * ratioThreshold && !s.missileIsDead, (s, c) => c.inbetweenCount++)
//       .transition("failed")
//     .build("start");
//   // fsa.debug = true;

//   class Context {
//     constructor() {
//       this.reset();
//       this.lastFsaTriggerTime = 0;
//     }

//     reset() {
//       this.stateReached = null;
//       this.chasingCount = 0;
//       this.deathTime = undefined;
//     }
//   }
//   let context = new Context();
  
//   game.detector.addCheck(history => {
//     let nextIdx = 0;
//     do {
//       nextIdx = fsa.process(history, context, nextIdx);
//       if (context.stateReached == "failed") context.reset();
//       if (context.chasingCount > chasingThreshold) game.addInfo("chasingCount", () => t`Chase it to death!`, 500);
//       else game.removeInfo("chasingCount");
//       if (context.deathTime !== undefined) {
//         // fsa.debug = true; fsa.process(history, c); fsa.debug = false;
//         game.addInfo("deadly chaser", t`Deadly chaser!`, 3000);
//         game.incrementScore(10);
//         context.lastFsaTriggerTime = context.deathTime;
//         context.reset();
//       }
//     } while (nextIdx != -1);
//   });
// });
