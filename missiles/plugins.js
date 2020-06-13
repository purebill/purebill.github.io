const GamePlugins = (function () {
  /** @type {((game: Game) => void)[]} */
  const plugins = [];

  const initializers = [];

  let insideInit = false;

  /**
   * @param {(game: Game) => Promise} initializer
   */
  function registerPreInit(initializer) {
    initializers.push(initializer);
  }

  /**
   * @param {(game: Game) => void} plugin
   */
  function register(plugin) {
    plugins.push(plugin);
  }

  /**
   * @param {Game} game
   * @return {Promise}
   */
  function preInit(game) {
    return Promise.all(initializers.map(i => i(game)));
  }

  /**
   * @param {Game} game
   */
  function init(game) {
    if (insideInit) throw new Error("Calling plugin.init() inside plugin.init()");

    plugins.forEach(it => {
      insideInit = true;
      try {
        it(game);
      } finally {
        insideInit = false;
      }
    });
  }

  return {
    registerPreInit,
    register,
    preInit,
    init
  };
})();