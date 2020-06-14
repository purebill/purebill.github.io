GamePlugins.register("retarget-missiles", [], game => {
  Timer.periodic(retargetMaybe, 500);

  const retargetMaxDist = T.fakeTargetRadius;

  function retargetMaybe() {
    let potentialTargets = game.flies
        .filter(it => it instanceof Plane || it instanceof FakeTarget);
    
    if (potentialTargets.length > 1) {
      let missiles = game.flies.filter(it => it instanceof Missile);

      missiles.forEach(m => {
        let distToTarget = m.target ? V.dist(m.xy, m.target.xy) : Infinity;

        let others = potentialTargets
            .filter(it => it !== m.target)
            .map(it => { it.distToM = V.dist(m.xy, it.xy); return it; });

        others.sort((a, b) => a.disToM < b.distToM ? -1 : (a.distToM > b.distToM ? 1 : 0));

        if (others[0].distToM < retargetMaxDist && others[0].distToM < distToTarget) {
          m.retarget(others[0]);
        }
      });
    }
  }
});