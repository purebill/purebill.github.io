import {Game} from './game.js'

const GamePlugins = (function () {
  const NOT_INITIALIZED = {};

  class PluginInfo {
    /**
     * @param {any} pluginId 
     * @param {any[]} dependencies
     * @param {(game: Game, ...dependencies: any) => any} plugin 
     */
    constructor(pluginId, dependencies, plugin) {
      this.pluginId = pluginId;
      this.dependencies = dependencies;
      this.plugin = plugin;
      this.pluginValue = NOT_INITIALIZED;
    }
  }
  /** @type {Map<string, PluginInfo>} */
  const plugins = new Map();

  let insideInit = false;

  /**
   * @param {any} pluginId
   * @param {any[]} dependencies
   * @param {(game: Game, ...dependencies: any) => any} plugin
   */
  function register(pluginId, dependencies, plugin) {
    if (plugins.has(pluginId)) throw new Error("Plugin with the id already exists: " + pluginId);
    plugins.set(pluginId, new PluginInfo(pluginId, dependencies, plugin));
  }

  /**
   * @param {Game} game
   */
  function init(game) {
    if (insideInit) throw new Error("Calling plugin.init() inside plugin.init()");

    for (let plugin of topologicalSort()) {
      insideInit = true;
      try {
        let resolved = plugin.dependencies
            .filter(it => plugins.has(it))
            .map(it => plugins.get(it))
            .filter(it => it.pluginValue !== NOT_INITIALIZED)
            .map(it => it.pluginValue);

        if (resolved.length != plugin.dependencies.length) {
          let missed = plugin.dependencies
              .filter(d => !plugins.has(d) || plugins.get(d).pluginValue === NOT_INITIALIZED)
              .map(d => (typeof d == "function" ? d.name : d))
              .map(d => `'${d}'`)
              .join(", ");
          console.log("[PLUGINS]", "Missed dependencies", missed,
              "for plugin",
              "'" + (typeof plugin.pluginId == "function" ? plugin.pluginId.name : plugin.pluginId) + "'.",
              "Not loaded");
          continue;
        }

        plugin.pluginValue = plugin.plugin(game, ...resolved);
      } finally {
        insideInit = false;
      }
    };
  }

  /**
   * @returns {PluginInfo[]}
   */
  function topologicalSort() {
    let sat = [];

    let rest = [];
    plugins.forEach(it => rest.push(it));

    let remove;
    do {
      remove = [];
      for (let p of rest) {
        let unsat = p.dependencies.filter(d => sat.findIndex(it => it.pluginId == d) == -1);
        if (unsat.length > 0) continue;
        sat.push(p);
        remove.push(p);
      }
      remove.forEach(it => rest.splice(rest.indexOf(it), 1));
    } while (remove.length > 0);

    rest.forEach(it => sat.push(it));

    return sat;
  }

  /**
   * @param {string} pluginId 
   * @returns {any | undefined}
   */
  function get(pluginId) {
    if (!plugins.has(pluginId)) return undefined;

    let value = plugins.get(pluginId).pluginValue;
    if (value === NOT_INITIALIZED) throw new Error("Plugin is not yet initialized: " + pluginId);
    
    return value;
  }

  return {
    register,
    init,
    get
  };
})();

export default GamePlugins;