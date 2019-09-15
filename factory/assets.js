const Assets = (function () {
  const assets = new Map();
  let loaded = false;

  function loadAsset(name) {
    return new Promise(resolve => {
      let img = document.createElement("img");
      img.onload = () => {
        assets.set(name, img);
        resolve();
      }
      img.src = "assets/" + name + ".png";
    });
  }

  function get(name) {
    assert(loaded, "Getting an asset before it got loaded");

    const asset = assets.get(name);
    assert(asset, "Asset not found");

    return asset;
  }

  const assetNames = ["ground", "sink", "factory", "source", "router", "delay"];
  function load() {
    return Promise.all(assetNames.map(name => loadAsset(name))).then(() => loaded = true);
  }

  return {
    load,
    get
  }
})();