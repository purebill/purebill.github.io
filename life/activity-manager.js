const ActivityManager = (function () {
  return {
    replace: f => {
      const snapshot = Keys.snapshot();
      Keys.resetToRoot();
      f(() => Keys.restoreFromSnapshot(snapshot));
    },

    append: f => {
      Keys.push();
      f(Keys.pop);
    }
  };
})();