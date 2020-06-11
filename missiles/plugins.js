const GamePlugins = (function () {
  /** @type {((game: Game) => void)[]} */
  const plugins = [];

  /**
   * @param {(game: Game) => void} plugin
   */
  function register(plugin) {
    plugins.push(plugin);
  }

  /**
   * @param {Game} game
   */
  function init(game) {
    plugins.forEach(it => it(game));
  }

  return {
    register,
    init
  };
})();