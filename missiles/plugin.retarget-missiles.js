GamePlugins.register("retarget-missiles", [], game => {
  Timer.periodic(retargetMaybe, 300);

  const retargetMaxDist = T.fakeTargetRadius;

  function retargetMaybe() {
    /**@type {Plane[]} */
    let potentialTargets = game.flies
        .filter(it => it instanceof Plane || it instanceof FakeTarget);
    
    if (potentialTargets.length > 1) {
      /**@type {Missile[]} */
      let missiles = game.flies.filter(it => it instanceof Missile);

      missiles.forEach(m => {
        let distToTarget = m.target ? V.dist(m.xy, m.target.xy) : Infinity;

        let others = potentialTargets
            .filter(it => it !== m.target)
            // for planes missile retargets only when it sees the engine
            .filter(it => !(it instanceof Plane) || V.dotProduct(V.subtract(it.xy, m.xy), m.v) >= 0)
            .map(it => { it.distToM = V.dist(m.xy, it.xy); return it; });

        if (others.length > 0) {
          others.sort((a, b) => a.disToM < b.distToM ? -1 : (a.distToM > b.distToM ? 1 : 0));

          // find the closest suitable target
          if (others[0].distToM < retargetMaxDist && others[0].distToM < distToTarget) {
            m.retarget(others[0]);
          }
        }
      });
    }
  }
});