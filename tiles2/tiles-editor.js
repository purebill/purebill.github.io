var TilesEditor = (function () {
  let currentTiles;

  $("saveTiles").onclick = function () {
    if (currentTiles.filter(it => !it.physicalWidth).length > 0) {
      alert("Нужно указать ширину для всех плиток");
      return;
    }

    hide();
    
    currentTiles.forEach(it => {
      let c = Config.tileSize / it.width;
      it.width = Config.tileSize;
      it.height = it.height * c;
    });

    let maxPhWidth = Math.max.apply(null, currentTiles.map(it => it.physicalWidth));
    currentTiles.forEach(it => {
      let c = it.physicalWidth / maxPhWidth;
      it.width = it.width * c;
      it.height = it.height * c;
    });

    let maxWidth = Math.max.apply(null, currentTiles.map(it => it.width));
    let maxHeight = Math.max.apply(null, currentTiles.map(it => it.height));
    let maxSize = Math.max(maxWidth, maxHeight);
    let c = Config.tileSize / maxSize;
    currentTiles.forEach(it => {
      it.width = Math.round(it.width * c);
      it.height = Math.round(it.height * c);
    });

    Promise.all(currentTiles.map(downscale)).then(tiles => {
      addEmpty(tiles);

      if (Tiles.isEmpty() || !confirm("Добавить к существующим?")) {
        Tiles.newTiles(tiles);
      } else {
        Tiles.addTiles(tiles);
      }
    });
  };

  $("cancelTiles").onclick = function () {
    hide();
  };

  function downscale(tile) {
    return new Promise(function (resolve) {
      var img = new Image;
      img.onload = function() {
        const w = img.naturalWidth;
        const h = img.naturalHeight;

        const c = document.createElement("canvas");
        c.width = tile.width;
        c.height = tile.height;

        c.getContext("2d").drawImage(this, 0, 0, tile.width, tile.height);
        resolve({
          name: tile.name,
          width: tile.width,
          height: tile.height,
          uri: c.toDataURL("image/jpeg", 0.90),
          hash: tile.hash
        });
      };
      img.src = tile.uri;
    });
  }

  function addEmpty(tiles) {
    var sizes = {};
    tiles.map(it => it.width + "x" + it.height).forEach(it => sizes[it] = true);
    Object.keys(sizes)
      .forEach(it => tiles.push({
        empty: true,
        width: parseInt(it.split("x")[0]),
        height: parseInt(it.split("x")[1]),
        name: "empty" + it,
        hash: "empty" + it
      }));
  }

  function edit(tiles) {
    currentTiles = tiles;

    show();

    let list = $("tilesEditorTiles");
    list.innerHTML = "";

    for (let tile of tiles) {
      let label = document.createElement("label");

      let wrap = document.createElement("div");
      wrap.style.width = Config.tileSize + "px";
      wrap.style.height = Config.tileSize + "px";

      let img = document.createElement("img");
      img.src = tile.uri;
      img.style.width = "100%";
      img.tile = tile;
      wrap.appendChild(img);

      label.appendChild(wrap);

      let sizeInput = document.createElement("input");
      sizeInput.type = "text";
      sizeInput.placeholder = "Ширина";
      (function (img) {
        sizeInput.onchange = function () {
          img.tile.physicalWidth = parseInt(this.value);
        };  
      }) (img);
      label.appendChild(sizeInput);

      list.appendChild(label);
    }
  }

  function show() {
    $("tilesEditor").style.display = "block";
  }

  function hide() {
    $("tilesEditor").style.display = "none";
  }

  return {
    edit
  };
}) ();