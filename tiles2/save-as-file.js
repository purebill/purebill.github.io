var saveAsFile = (function () {
  function loadImage(idx, uri) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve({
          idx: idx,
          img: img
        });
      }
      img.src = uri;
    });
  }

  function loadTiles(wall, palete) {
    var paleteMap = {};
    palete.forEach(function (it) {paleteMap[it.hash] = it;});

    var promises = {};
    var rows = wall.length;
    var cols = wall[0].length;
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var div = wall[row][col];
        if (paleteMap[div.idx] && paleteMap[div.idx].uri) {
          promises[div.idx] = promises[div.idx] || loadImage(div.idx, paleteMap[div.idx].uri);
        }
      }
    }

    return Promise.all(Object.keys(promises).map(function (it) { return promises[it]; }))
      .then(function (imgs) {
        var tiles = {};
        imgs.forEach(function (img) { tiles[img.idx] = img.img; });
        return tiles;
      });
  }

  function saveAsFile(name, wall, palete) {
    var rows = wall.length;
    var cols = wall[0].length;
    var tileSize = 64;

    var canvas = document.createElement("canvas");
    canvas.width = (tileSize + 1) * cols;
    canvas.height = (tileSize + 1) * rows;

    var ctx = canvas.getContext("2d");
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    loadTiles(wall, palete).then(function (tiles) {
      for (var row = 0; row < rows; row++) {
        for (var col = 0; col < cols; col++) {
          var div = wall[row][col];
          var img = tiles[div.idx];
          var angle = div.angle;

          if (img) {
            ctx.save();
            ctx.translate(col * (tileSize + 1) + tileSize/2, row * (tileSize + 1) + tileSize/2);
            ctx.rotate(angle * Math.PI / 180);
            ctx.drawImage(img, -tileSize/2, -tileSize/2);
            ctx.restore();
          }
        }
      }
  
      canvas.toBlob(function (blob) {
        saveAs(blob, name + ".jpg");
      }, "image/jpeg", 0.9);
    });

  }

  return saveAsFile;
})();