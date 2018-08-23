"use strict";

var Tiles = (function () {
  var prefix = "#tilesman#";

  Version.get().then(function (version) {
    $("version").innerHTML = "v" + version;
  });

  Version.subscribe(function () {
    $("newVersion").style.display = "";
  });

  $("newVersion").onclick = function () {
    window.location.reload();
  };

  function newDocument(cells) {
    saveFirst();
    create(parseInt($("N").value), parseInt($("M").value), cells);
    loaded("");
    State.add("");
    currentVersion = 0;
    Undo.reset();
  }

  $("newRandom").onclick = function () {
    newDocument();
  }

  $("newEmpty").onclick = function () {
    let empty = currentTiles
      .filter(it => it.empty)
      .sort((a, b) => a.width * a.height > b.width * b.height ? -1 : (a.width * a.height == b.width * b.height ? 0 : 1))
      [0].name;
    newDocument(empty);
  }

  $("saveAsJpeg").onclick = function () {
    saveAsFile(currentName, wall, currentTiles);
  }

  $("save").onclick = function () {
    var name = prompt("Имя", currentName);
    if (name != null) {
      Message.show("Сохраняю...");

      currentName = name;
      var state = getState();
      var stateJson = JSON.stringify(state);
      
      var savedLocally = true;
      try {
        localStorage.setItem(prefix + name, stateJson);
      } catch (e) {
        savedLocally = false;
        console.error(e);
      }

      savedLocally && Message.hide();

      function nop() {}

      Firebase.save(name, stateJson).then(function () {
        Message.hide();
      }).catch(nop);
      Firebase.saveVersion(name, JSON.stringify(state.version)).catch(nop);

      loaded(name);
      loadStates();
    }
  }

  $("saved").onchange = function () {
    if (this.value != "") {
      load(this.value);
      State.add(this.value);
    }
  }

  function load(key) {
    saveFirst();

    Message.show("Загрузжаю...");

    var select = $("saved");

    var option;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value == key) {
        option = select.options[i];
        break;
      }
    }
    if (option) {
      loadState(key, option.firebase).then(function (cells) {
        restoreState(cells).then(function () {
          loaded(key);
        });
      });
    } else {
      Message.hide();
    }
  }

  function loadState(key, firebase) {
    if (firebase) {
      return Firebase.load(key);
    }

    try {
      var cells = JSON.parse(localStorage[prefix + key]);
      var localVersion = cells.version || 0;
      
      return Firebase.loadVersion(key).then(function (remoteVersion) {
        if (remoteVersion > localVersion) {
          return Firebase.load(key); 
        } else {
          return Promise.resolve(cells);
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  function loaded(name) {
    currentName = name;
    changed = false;
    $("saved").selectedIndex = 0;
    Message.hide();
    window.document.title = "Плиткач :: " + name;
  }

  $("undo").onclick = Undo.undo;
  $("redo").onclick = Undo.redo;

  $("calculate").onclick = function () {
    loadSaved().then(function (states) {
      var div = $("calculateOptions");
      div.innerHTML = "";

      if (!currentName) {
        states.push({
          key: currentName
        });
      }
      
      states.forEach(function (state) {
        var label = document.createElement("label");
        
        var checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.currentName = state.key;
        checkbox.firebase = state.firebase;
        checkbox.checked = state.key == currentName;
        
        label.for = checkbox.id;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(state.key ? state.key : "<Текущиц>"));
        
        div.appendChild(label);
      });

      $("selectToCalculate").style.display = "inline-block";
    });
  };

  $("doCalcualte").onclick = function () {
    $("selectToCalculate").style.display = "none";

    Promise.all(
      $($("selectToCalculate").getElementsByTagName("input"))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.currentName == currentName ? Promise.resolve(getState()) : loadState(checkbox.currentName, checkbox.firebase))
    ).then(function (states) {
      if (states.length == 0) {
        $("selectToCalculate").style.display = "none";
        return;
      }

      var table = {};

      states.forEach(function (state) {
        var wall = state.cells;
        var tiles = state.tiles;

        tiles.forEach(addCssStyle);

        var rows = wall.length;
        var cols = wall[0].length;
        for (var row = 0; row < rows; row++) {
          for (var col = 0; col < cols; col++) {
            var idx = wall[row][col].idx;
            table[idx] == undefined && (table[idx] = 0);
            table[idx]++;
          }
        }
      });
  
      var div = $("calculations");
      div.style.display = "block";
      ["main", "controls", "tiles"].forEach(function (it) { $(it).style.display = "none"; });
      div.innerHTML = Object.keys(table)
        .map(function (it) {
          return "<div class='tile" + it + "'><span>" + table[it] + "</span></div>";
        })
        .join("\n");
      });
  };

  $("closeCalculate").onclick = function () {
    $("selectToCalculate").style.display = "none";
  };

  $("calculations").onclick = function () {
    $("calculations").style.display = "none";
    ["main", "controls", "tiles"].forEach(function (it) { $(it).style.display = "block"; });
  };

  State.init(hash => {
    let uidPrefix = "uid/";
    if (hash.startsWith(uidPrefix)) {
      Uid.set(hash.substr(uidPrefix.length));
      State.replace("");
      loadStates();
      return;
    }

    if (hash.length > 0) {
      load(hash);
    }
  });

  Uid.uid().then(function () {
    // as soon as the uid is available, allow to copy it
    $("copyUid").disabled = false;
  });

  $("copyUid").onclick = function () {
    Uid.uid().then(function (uid) {
      let l = window.location;
      $("uidUrl").value = l.protocol + "//" + l.host + l.pathname + "#uid/" + uid;
      $("copyUidForm").style.display = "table-cell";
    });
  };
  $("copyUidUrl").onclick = function () {
    Clipboard.copy($("uidUrl").value);
    $("copyUidForm").style.display = "none";
  };
  $("copyUidUrlClose").onclick = function () {
    $("copyUidForm").style.display = "none";
  };

  // every action should set 'changed' as the model staus and reset it to the previous value on undo
  let originalDo = Undo.do;
  Undo.do = (o) => {
    var oldChanged = changed;
    return originalDo({
      do: () => {
        changed = true;
        o.do();
      },
      undo: () => {
        o.undo();
        changed = oldChanged;
      }
    });
  };

  Undo.onChange(updateUndo);
  updateUndo();

  window.onkeydown = function (e) {
    e = window.event ? event : e;
    if (e.keyCode == 90 && e.ctrlKey) {
      e.preventDefault();
      $("undo").onclick();
    } else if (e.keyCode == 89 && e.ctrlKey) {
      e.preventDefault();
      $("redo").onclick();
    } else if (e.keyCode == 83 && e.ctrlKey) {
      e.preventDefault();
      $("save").onclick();
    } else if (e.keyCode == 69 && e.ctrlKey) {
      e.preventDefault();
      $("saveAsJpeg").onclick();
    }
  };

  window.onresize = onResize;

  window.onbeforeunload = function (e) {
    var message = "Не сохранено. Всё равно уйти?";

    if (!changed) return;//message = undefined;

    e = e || window.event;
    if (e) {
      e.preventDefault();
      if (message !== undefined) {
        e.returnValue = message;
      }
    }

    return message;
  };

  var palete = {};
  var selectedIdx;
  var currentName;
  var currentVersion = 0;
  var changed = false;
  var currentTiles;
  var wall;

  $(() => {
    onResize();
    loadStates().then(function () {
      let name = State.get();
      if (name) {
        load(name);
      } else {
        Message.show("Перетяните сюда изображения плитки или загрузите сохранённый дизайн.");
      }
    });      
  });

  disableControls();

  function disableControls() {
    $("save").disabled = true;
    $("saveAsJpeg").disabled = true;
    // $("calculate").disabled = true;
  }

  function enableControls() {
    $("save").disabled = false;
    $("saveAsJpeg").disabled = false;
    // $("calculate").disabled = false;
  }

  function saveFirst() {
    if (changed) {
      var doSave = window.confirm("Сохранить текущий?");
      if (doSave) {
        $("save").onclick();
      }
      changed = false;
    }
  }

  function onResize(e) {
    $("main").style.width = (window.innerWidth - 180).toString() + "px";
    $("main").style.height = (window.innerHeight - 50).toString() + "px";
    $("tiles").style.height = (window.innerHeight - 50).toString() + "px";
  }

  function addTile(tile) {
    var div = document.createElement("div");
    var idx = tile.hash;
    div.className = "tile" + idx;
    div.idx = idx;
    div.id = div.className;
    palete[idx] = div;
    div.onclick = function () {
      if (selectedIdx == this.idx) {
        unselect(this);
        selectedIdx = undefined;
        return;
      }
      
      if (selectedIdx) {
        unselect($("tile" + selectedIdx));
      }
      selectedIdx = this.idx;
      select($("tile" + selectedIdx));
    };
    
    if (!idx.startsWith("empty")) {
      let a = document.createElement("a");
      a.innerHTML = "X";
      a.className = "delete";
      a.title = "Удалить";
      a.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (idx.startsWith("empty")) return;

        if (confirm("Удалить?")) {
          var used = false;
          var rows = wall.length;
          for (var row = 0; row < rows; row++) {
            var cols = wall[row].length;
            for (var col = 0; col < cols; col++) {
              if (wall[row][col].idx == idx) {
                used = true;
                break;
              }
            }
          }
          if (!used) {
            unselect(div);
            delete palete[idx];
            currentTiles =  currentTiles.filter(function (it) { return it.hash != idx;});
            $("tiles").removeChild(div);
          } else {
            alert("Не могу. Используется");
          }
        }
      };
      div.appendChild(a);
    }

    $("tiles").appendChild(div);
  }

  function createPalete(tiles) {
    $("tiles").innerHTML = "";
    palete = {};
    selectedIdx = undefined;

    tiles.forEach(addTile);

    $("newRandom").disabled = false;
    $("newEmpty").disabled = false;
  }

  function create(N, M, cells) {
    changed = !cells;

    var container = $("container");

    container.innerHTML = "";
    wall = [];

    // do not include 'empty' tiles
    let maxRand = Object.keys(palete).filter(it => !it.startsWith("empty")).length - 1;

    for (var row = 0; row < M; row++) {
      wall[row] = [];
      
      var span = document.createElement("span");

      for (var col = 0; col < N; col++) {
        var idx, angle;
        if (typeof cells === "string") {
          idx = cells;
          angle = 0;
        } else if (!cells) {
          idx = Object.keys(palete)[rand(0, maxRand)];
          angle = 0;
        } else {
          idx = Bootstrap.fromLegacyIdx(cells[row][col].idx);
          angle = cells[row][col].angle;
        }

        let div = createCellDiv(idx, angle);

        span.appendChild(div);

        wall[row][col] = div;
      }
      container.appendChild(span);
    }

    if (N > 0) enableControls();
  }

  function createCellDiv(idx, angle) {
    var div = document.createElement("div");
    div.idx = idx;
    div.angle = angle;
    addClass(div, "tile" + idx);
    addClass(div, "rotate" + angle);
    
    div.oncontextmenu = function (e) {
      e.preventDefault();

      palete[this.idx].scrollIntoView();
      palete[this.idx].onclick();
    };

    div.onclick = function (e) {
      e.preventDefault();

      let {rowIdx, colIdx} = findDiv(this);

      if (!selectedIdx || selectedIdx == this.idx) {
        Undo.do(rotateAction(rowIdx, colIdx));
        return;
      }
      
      if (selectedIdx) {
        Undo.do(changeAction(rowIdx, colIdx));
      }
    };

    addHoverLink(div, "add-right", "→", "Добавить столбец справа", addColRightAction);
    addHoverLink(div, "add-below", "↓", "Добавить строку снизу", addRowBelowAction);
    addHoverLink(div, "remove-row", "X", "Удалить эту строку", removeRowAction);
    addHoverLink(div, "remove-col", "X", "Удалить этот столбец", removeColAction);

    return div;
  }

  function addHoverLink(div, className, text, title, action) {
    let hoverAction = document.createElement("a");
    hoverAction.innerHTML = text;
    hoverAction.className = "hover " + className;
    hoverAction.title = title;
    hoverAction.onclick = e => {
      e.stopPropagation();
      Undo.do(action(div));
    };
    div.appendChild(hoverAction);
  }

  function removeColAction(div) {
    let {_, colIdx} = findDiv(div);
    let oldCol;
    return {
      do: () => {
        oldCol = [];
        for (let i = 0; i < wall.length; i++) {
          let row = wall[i];
          let div = row[colIdx];
          row.splice(colIdx, 1);
          oldCol.push(div);
          div.parentElement.removeChild(div);
        }
      },
      undo: () => {
        for (let rowIdx = 0; rowIdx < wall.length; rowIdx++) {
          let newDiv = oldCol[rowIdx];
          // let newDiv = createCellDiv(oldDiv.idx, oldDiv.angle);
          let row = wall[rowIdx];
          let span = row[0].parentElement;
          span.insertBefore(newDiv, colIdx == row.length ? null : row[colIdx]);
          row.splice(colIdx, 0, newDiv);
        }
      }
    };
  }

  function removeRowAction(div) {
    let {rowIdx, } = findDiv(div);
    let oldRow;
    return {
      do: () => {
        let span = wall[rowIdx][0].parentElement;
        oldRow = wall.splice(rowIdx, 1)[0];
        span.parentElement.removeChild(span);
      },
      undo: () => {
        let span = document.createElement("span");
        let newRow = oldRow;//oldRow.map(div => createCellDiv(div.idx, div.angle));
        newRow.forEach(div => span.appendChild(div));
        let rowSpan = rowIdx < wall.length ? wall[rowIdx][0].parentElement : null;
        wall[0][0].parentElement.parentElement.insertBefore(span, rowSpan);
        wall.splice(rowIdx, 0, newRow);
      }
    };
  }

  function addRowBelowAction(div) {
    let {rowIdx, } = findDiv(div);
    return {
      do: () => {
        let span = document.createElement("span");
        let newRow = wall[rowIdx].map(div => createCellDiv(div.idx, div.angle));
        newRow.forEach(div => span.appendChild(div));
        let rowSpan = wall[rowIdx][0].parentElement;
        rowSpan.parentElement.insertBefore(span, rowSpan.nextSibling);
        wall.splice(rowIdx, 0, newRow);
      },
      undo: () => {
        let span = wall[rowIdx + 1][0].parentElement;
        span.parentElement.removeChild(span);
        wall.splice(rowIdx + 1, 1);
      }
    };
  }

  function addColRightAction(div) {
    let {colIdx, } = findDiv(div);

    return {
      do: () => {
        for (let rowIdx = 0; rowIdx < wall.length; rowIdx++) {
          let row = wall[rowIdx];
          let div = row[colIdx];
          let newDiv = createCellDiv(div.idx, div.angle);
          div.parentElement.insertBefore(newDiv, colIdx == row.length - 1 ? null : row[colIdx + 1]);
          row.splice(colIdx + 1, 0, newDiv);
        }
      },
      undo: () => {
        for (let i = 0; i < wall.length; i++) {
          let row = wall[i];
          let div = row[colIdx + 1];
          row.splice(colIdx + 1, 1);
          div.parentElement.removeChild(div);
        }
      }
    };
  }

  function findDiv(theDiv) {
    for (let rowIdx = 0; rowIdx < wall.length; rowIdx++) {
      for (let colIdx = 0; colIdx < wall[rowIdx].length; colIdx++) {
        if (wall[rowIdx][colIdx] === theDiv) {
          return {rowIdx, colIdx};
        }
      }
    }

    throw new Error("Can't find div", div);
  }

  function rotateAction(rowIdx, colIdx) {
    return {
      do: () => rotate(rowIdx, colIdx),
      undo: () => unrotate(rowIdx, colIdx)
    };
  }

  function changeAction(rowIdx, colIdx) {
    var oldIdx = wall[rowIdx][colIdx].idx;
    
    return {
      do: function () {
        let e = wall[rowIdx][colIdx];
        removeClass(e, "tile" + e.idx);
        e.idx = selectedIdx;
        addClass(e, "tile" + e.idx);
      },
      undo: function () {
        let e = wall[rowIdx][colIdx];
        removeClass(e, "tile" + e.idx);
        e.idx = oldIdx;
        addClass(e, "tile" + e.idx);
      }
    };
  }

  function getState() {
    var cells = [];

    var rows = wall.length;
    for (var row = 0; row < rows; row++) {
      cells[row] = [];
      var cols = wall[row].length;
      for (var col = 0; col < cols; col++) {
        cells[row][col] = {
          idx: wall[row][col].idx,
          angle: wall[row][col].angle
        }
      }
    }

    return {
      tiles: currentTiles,
      cells: cells,
      version: ++currentVersion
    };
  }

  function restoreState(state) {
    return new Promise(function (resolve) {
      var tiles = state.tiles;

      var c = function () {
        var cells = state.cells || state;

        var rows = cells.length;
        var cols = cells[0].length;
        $("N").value = rows;
        $("M").value = cols;
        create(cols, rows, cells);
        Undo.reset();
        currentVersion = state.version || 0;
        resolve();
      };

      if (tiles) {
        newTiles(tiles);
        c();
      } else {
        Bootstrap.loadLegacyTiles().then(c);
      }
    });
  }

  function storedKeys() {
    return Object.keys(localStorage)
      .filter(function (key) { return key.startsWith(prefix); })
      .map(function (key) { return key.substr(prefix.length) ;});
  }

  function loadSaved() {
    return new Promise(function (resolve) {
      var states = [];
      storedKeys().forEach(function (key) {
        states.push({
          key: key
        });
      });

      var localKeys = storedKeys();
      Firebase.loadKeys().then(function (keys) {
        keys.forEach(function (key) {
          if (localKeys.indexOf(key) != -1) return;

          states.push({
            key: key,
            firebase: true
          });
        });

        resolve(states);
      }).catch(function () { resolve(states); });
    });
  }

  function loadStates() {
    return loadSaved().then(function (states) {
      var select = $("saved");
      select.innerHTML = "<option value='' selected>Загрузить</option>";
      states.forEach(function (state) {
        var option = document.createElement("option");
        option.value = state.key;
        option.innerHTML = state.key;
        option.firebase = state.firebase;
        select.appendChild(option);
      });
    });
  }

  function updateUndo() {
    $("undo").disabled = !Undo.canUndo();
    $("redo").disabled = !Undo.canRedo();
  }

  function unselect(e) {
    removeClass(e, "selected");
  }
  function select(e) {
    addClass(e, "selected");
  }

  function rotate(rowIdx, colIdx) {
    let e = wall[rowIdx][colIdx];
    removeClass(e, "rotate" + e.angle);
    e.angle = (e.angle + 90) % 360;
    addClass(e, "rotate" + e.angle);
  }

  function unrotate(rowIdx, colIdx) {
    let e = wall[rowIdx][colIdx];
    removeClass(e, "rotate" + e.angle);
    e.angle = (e.angle + 270) % 360;
    addClass(e, "rotate" + e.angle);
  }

  function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  }

  var cssStylesCreated = {};

  function addCssStyle(it) {
    if (!it.width) it.width = Config.legacyTileSize;
    if (!it.height) it.height = Config.legacyTileSize;

    if (!cssStylesCreated[it.hash]) {
      if (it.empty) {
        createCSSSelector(".tile" + it.hash, 
          "width: " + it.width + "px; height: " + it.height + "px; background-color: white;");
        createCSSSelector(".tile" + it.hash + ".rotate90, " + ".tile" + it.hash + ".rotate270",
          "width: " + it.height + "px; height: " + it.width + "px;");
      } else {
        // using technique from here https://www.sitepoint.com/css3-transform-background-image/
        createCSSSelector(".tile" + it.hash, 
          "width: " + it.width + "px; height: " + it.height + "px;");
        createCSSSelector(".tile" + it.hash + ".rotate90, " + ".tile" + it.hash + ".rotate270",
          "width: " + it.height + "px; height: " + it.width + "px;");

        createCSSSelector(".tile" + it.hash + ":before",
          "border: 1px solid black; content: ''; position: absolute; z-index: 900; background-image: url('" + it.uri + "'); width: " + it.width + "px; height: " + it.height + "px;");

        createCSSSelector(".tile" + it.hash + ".rotate90:before",
          "top: -" + it.height + "px; transform-origin: bottom left;");

        createCSSSelector(".tile" + it.hash + ".rotate270:before",
          "top: " + it.width + "px; transform-origin: top left;");
      }
    }
    cssStylesCreated[it.hash] = true;
  }

  function newTiles(tiles) {
    saveFirst();

    if (tiles.filter(it => it.empty).length === 0) {
      tiles.push({
        empty: true,
        name: "empty",
        hash: "empty",
        width: 64,
        height: 64
      })
    }
    
    tiles.forEach(addCssStyle);

    createPalete(tiles);
    create(0, 0);
    loaded("");
    disableControls();

    currentTiles = tiles;
  }

  function addTiles(tiles) {
    if (!currentTiles) {
      newTiles(tiles);
      return;
    }

    tiles = tiles.filter(function (it) {
      return currentTiles.findIndex(function (existing) { return existing.hash == it.hash; }) == -1;
    });

    tiles.forEach(addCssStyle);

    tiles.forEach(function (it) { currentTiles.push(it); });

    createPalete(currentTiles);
  }

  return {
    isEmpty: function () { return !currentTiles; },
    newTiles: newTiles,
    addTiles: addTiles
  };
}) ();