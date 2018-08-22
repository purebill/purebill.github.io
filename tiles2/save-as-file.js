var saveAsFile = (function () {
  function loadImage(tile) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve({
          tile: tile,
          img: img
        });
      }
      img.src = tile.uri;
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
        let tile = paleteMap[div.idx];
        if (tile.uri) {
          promises[div.idx] = promises[div.idx] || loadImage(tile);
        } else {
          promises[div.idx] = promises[div.idx] || Promise.resolve({ tile: tile, empty: true });
        }
      }
    }

    return Promise.all(Object.keys(promises).map(function (it) { return promises[it]; }))
      .then(function (tiles) {
        let lookup = {};
        tiles.forEach(it => lookup[it.tile.hash] = it);
        return lookup;
      });
  }

  function saveAsFile(name, wall, palete) {
    var rows = wall.length;
    var cols = wall[0].length;

    loadTiles(wall, palete).then(function (lookup) {
      let width = 0;
      let height = 0;
      for (var row = 0; row < rows; row++) {
        let rowWidth = 0;
        let rowHeight = 0;
        for (var col = 0; col < cols; col++) {
          let div = wall[row][col];
          let tile = lookup[div.idx];
          let angle = div.angle;
          let w = (angle == 0 || angle == 180) ? tile.tile.width + 1 : tile.tile.height + 1;
          let h = (angle == 0 || angle == 180) ? tile.tile.height + 1 : tile.tile.width + 1;
          rowWidth += w;
          if (h > rowHeight) {
            rowHeight = h;
          }
        }
        if (rowWidth > width) {
          width = rowWidth;
        }
        height += rowHeight;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
  
      let top = 0;
      for (var row = 0; row < rows; row++) {
        let left = 0;
        let rowHeight = 0;
        for (let col = 0; col < cols; col++) {
          const div = wall[row][col];
          const tile = lookup[div.idx];
          const img = tile.img;
          const angle = div.angle;

          let imgHeight;
          if (img) {
            ctx.save();
            if (angle == 0 || angle == 180) {
              ctx.translate(left + img.naturalWidth/2, top + img.naturalHeight/2);
              ctx.rotate(angle * Math.PI / 180);
              ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
              ctx.restore();
              left += img.naturalWidth + 1;
              imgHeight = img.naturalHeight + 1;
            } else {
              ctx.translate(left + img.naturalHeight/2, top + img.naturalWidth/2);
              ctx.rotate(angle * Math.PI / 180);
              ctx.drawImage(img, -img.naturalWidth/2, -img.naturalHeight/2);
              ctx.restore();
              left += img.naturalHeight + 1;
              imgHeight = img.naturalWidth + 1;
            }
          } else {
            left += (angle == 0 || angle == 180) ? tile.tile.width + 1 : tile.tile.height + 1;
            imgHeight = (angle == 0 || angle == 180) ? tile.tile.height + 1 : tile.tile.width + 1;
          }
          if (imgHeight > rowHeight) rowHeight = imgHeight;
        }
        top += rowHeight;
      }
  
      canvas.toBlob(function (blob) {
        saveAs(blob, name + ".jpg");
      }, "image/jpeg", 0.9);
    });

  }

  return saveAsFile;
})();