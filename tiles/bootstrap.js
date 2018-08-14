var fromLegacyIdx = (function () {
  var legacy = {
    "30": "empty"
  };

  function fromLegacyIdx(idx) {
    return legacy[idx] || idx;
  }

  function loadXHR(name, url) {
      return new Promise(function(resolve, reject) {
          try {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url);
              xhr.responseType = "blob";
              xhr.onerror = function() {reject("Network error.")};
              xhr.onload = function() {
                  if (xhr.status === 200) {
                    var file = xhr.response;
                    file.name = name;
                    Files.toDataUri(file).then(function (uri) {
                      legacy[name.replace(/^tile(..).jpg$/, "$1")] = uri.hash;
                      resolve(uri);
                    })
                  }
                  else {reject("Loading error:" + xhr.statusText)}
              };
              xhr.send();
          }
          catch(err) {reject(err.message)}
      });
  }

  var tiles = [
    "tile01.jpg",
    "tile02.jpg",
    "tile03.jpg",
    "tile04.jpg",
    "tile05.jpg",
    "tile06.jpg",
    "tile07.jpg",
    "tile08.jpg",
    "tile09.jpg",
    "tile10.jpg",
    "tile11.jpg",
    "tile12.jpg",
    "tile13.jpg",
    "tile14.jpg",
    "tile15.jpg",
    "tile16.jpg",
    "tile17.jpg",
    "tile18.jpg",
    "tile19.jpg",
    "tile20.jpg",
    "tile21.jpg",
    "tile22.jpg",
    "tile23.jpg",
    "tile24.jpg",
    "tile25.jpg",
    "tile26.jpg",
    "tile27.jpg",
    "tile28.jpg",
    "tile29.jpg"
  ];

  if (!location.host.startsWith("localhost")) {
    Promise.all(tiles.map(function (it) { return loadXHR(it, "img/" + it); })).then(function (tiles) {
      Tiles.newTiles(tiles);
    });
  }

  return fromLegacyIdx;
}) ();