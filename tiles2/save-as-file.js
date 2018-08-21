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

    loadTiles(wall, palete).then(function (tiles) {
      let width = 0;
      let height = 0;
      for (var row = 0; row < rows; row++) {
        let rowWidth = 0;
        let rowHeight = 0;
        for (var col = 0; col < cols; col++) {
          let div = wall[row][col];
          let img = tiles[div.idx];
          let angle = div.angle;
          rowWidth += img.naturalWidth + 1;
          if (img.naturalHeight + 1 > rowHeight) {
            rowHeight = img.naturalHeight + 1;
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
        for (var col = 0; col < cols; col++) {
          var div = wall[row][col];
          var img = tiles[div.idx];
          var angle = div.angle;

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
            left += 64 + 1;
            imgHeight = 64 + 1;
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