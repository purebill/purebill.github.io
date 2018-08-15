"use strict";

var Tiles = (function () {
  var prefix = "#tilesman#";

  // one time localStorage migration
  if (!localStorage['tilesman-version']) {
    Object.keys(localStorage).forEach(function (key) {
      localStorage[prefix + key] = localStorage[key];
    });
    Version.get().then(function (version) {
      localStorage['tilesman-version'] = version;
    })
  }
  
  Version.get().then(function (version) {
    $("version").innerHTML = "v" + version;
  });

  Version.subscribe(function (newVersion, oldVersion) {
    $("newVersion").style.display = "";
  });

  $("newVersion").onclick = function () {
    window.location.reload();
  };

  var container = document.getElementById("container");

  $("apply").onclick = function () {
    saveFirst();
    create(parseInt($("N").value), parseInt($("M").value));
    loaded("");
  }

  $("save").onclick = function () {
    var name = prompt("Имя", currentName);
    if (name != null) {
      Message.show("Сохраняю...");

      currentName = name;
      var state = getState();
      
      var savedLocally = true;
      try {
        localStorage.setItem(prefix + name, state);
      } catch (e) {
        savedLocally = false;
        console.error(e);
      }

      savedLocally && Message.hide();

      Firebase.save(name, state).then(function () {
        Message.hide();
      });

      changed = false;
      loadStates();
    }
  }

  $("saved").onchange = function () {
    if (this.value != "") {
      load(this.value);
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
      if (option.firebase) {
        Firebase.load(key).then(function (cells) {
          restoreState(cells).then(function () {
            loaded(key);
          });
        });
      } else {
        var cells = JSON.parse(localStorage[prefix + key]);
        restoreState(cells).then(function () {
          loaded(key);
        });
      }
    }
  }

  function loaded(name) {
    currentName = name;
    changed = false;
    window.location.hash = "#" + name;
    $("saved").selectedIndex = 0;
    Message.hide();
  }

  $("undo").onclick = Undo.undo;
  $("redo").onclick = Undo.redo;

  $("calculate").onclick = function () {
    var rows = wall.length;
    var cols = wall[0].length;
    var table = {};
    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var idx = wall[row][col].idx;
        table[idx] == undefined && (table[idx] = 0);
        table[idx]++;
      }
    }

    var div = $("calculations");
    div.style.display = "block";
    ["main", "controls", "tiles"].forEach(function (it) { $(it).style.display = "none"; });
    div.innerHTML = Object.keys(table)
      .map(function (it) {
        return "<div class='tile" + it + "'><span>" + table[it] + "</span></div>";
      })
      .join("\n");
  };

  $("calculations").onclick = function () {
    $("calculations").style.display = "none";
    ["main", "controls", "tiles"].forEach(function (it) { $(it).style.display = "block"; });
  };

  Uid.uid().then(function (uid) {
    $("uid").value = uid;
    $("copyUid").disabled = false;
  });

  $("copyUid").onclick = function () {
    Clipboard.copy($("uid").value);
  }

  $("newUid").onclick = function () {
    var newUid = prompt("Новый идентификатор");
    if (newUid != null) {
      Uid.set(newUid);
      $("uid").value = newUid;
      loadStates();
      loaded("");
    }
  }

  Undo.onChange(updateUndo);
  updateUndo();

  window.onkeydown = function (e) {
    e = window.event ? event : e
    if (e.keyCode == 90 && e.ctrlKey) {
      $("undo").onclick();
    }
  };

  window.onkeydown = function (e) {
    e = window.event ? event : e;
    if (e.keyCode == 90 && e.ctrlKey) {
      $("undo").onclick();
    } else if (e.keyCode == 89 && e.ctrlKey) {
      $("redo").onclick();
    }
  };

  window.onresize = onResize;

  window.onbeforeunload = function (e) {
    var message = "Не сохранено. Всё равно уйти?";

    if (!changed) message = null;

    e = e || window.event;
    if (e) {
      event.preventDefault();
      if (message != null) {
        e.returnValue = message;
      }
    }

    return message;
  };

  var palete = {};
  var selectedIdx;
  var currentName;
  var changed = false;

  onResize();
  loadStates().then(function () {
    if (window.location.hash != "") {
      load(decodeURIComponent(window.location.hash).substr(1));
    }
  });
  disableControls();

  function disableControls() {
    $("save").disabled = true;
    $("calculate").disabled = true;
  }

  function enableControls() {
    $("save").disabled = false;
    $("calculate").disabled = false;
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
    $("main").style.width = (window.innerWidth - 120).toString() + "px";
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
    $("tiles").appendChild(div);
  }

  function createPalete(tiles) {
    $("tiles").innerHTML = "";
    palete = {};
    selectedIdx = undefined;

    tiles.forEach(addTile);

    addTile({
      name: "empty",
      hash: "empty"
    });

    $("apply").disabled = false;
  }

  var wall;

  function create(N, M, cells) {
    changed = !cells;

    $("container").innerHTML = "";
    wall = [];

    for (var row = 0; row < M; row++) {
      wall[row] = [];
      
      var span = document.createElement("span");
      span.style.width = (N * (64 + 2)).toString() + "px";

      for (var i = 0; i < N; i++) {
        var div = document.createElement("div");
        var idx, angle;
        if (!cells) {
          // do not include 'empty' tile
          var idx = Object.keys(palete)[rand(0, Object.keys(palete).length - 2)];
          angle = 0;
        } else {
          idx = Bootstrap.fromLegacyIdx(cells[row][i].idx);
          angle = cells[row][i].angle;
        }
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

          if (!selectedIdx || selectedIdx == this.idx) {
            Undo.do(rotateAction(this));
            return;
          }
          
          if (selectedIdx) {
            Undo.do(changeAction(this));
          }
        };
        span.appendChild(div);

        wall[row][i] = div;
      }
      container.appendChild(span);
    }

    if (N > 0) enableControls();
  }

  function rotateAction(e) {
    var oldChanged = changed;

    return {
      do: function () {
        rotate(e);
        changed = true;
      },
      undo: function () {
        unrotate(e);
        changed = oldChanged;
      }
    };
  }

  function changeAction(e) {
    var oldChanged = changed;
    var oldIdx = e.idx;
    
    return {
      do: function () {
        removeClass(e, "tile" + e.idx);
        e.idx = selectedIdx;
        addClass(e, "tile" + e.idx);
        changed = true;
      },
      undo: function () {
        removeClass(e, "tile" + e.idx);
        e.idx = oldIdx;
        addClass(e, "tile" + e.idx);
        changed = oldChanged;
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

    return JSON.stringify({
      tiles: currentTiles,
      cells: cells
    });
  }

  function restoreState(state) {
    return new Promise(function (resolve, reject) {
      var tiles = state.tiles;

      var c = function () {
        var cells = state.cells || state;

        var rows = cells.length;
        var cols = cells[0].length;
        $("N").value = rows;
        $("M").value = cols;
        create(cols, rows, cells);
        Undo.reset();
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

  function loadStates() {
    return new Promise(function (resolve) {
      var select = $("saved");
      select.innerHTML = "<option value='' selected>Загрузить</option>";
      storedKeys().forEach(function (key) {
        var option = document.createElement("option");
        option.value = key;
        option.innerHTML = key;
        select.appendChild(option);
      });

      var localKeys = storedKeys();
      Firebase.loadKeys().then(function (keys) {
        keys.forEach(function (key) {
          if (localKeys.indexOf(key) != -1) return;

          var option = document.createElement("option");
          option.firebase = true;
          option.value = key;
          option.innerHTML = key;
          select.appendChild(option);
        });
      }).then(resolve);
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

  function rotate(e) {
    removeClass(e, "rotate" + e.angle);
    e.angle = (e.angle + 90) % 360;
    addClass(e, "rotate" + e.angle);
  }

  function unrotate(e) {
    removeClass(e, "rotate" + e.angle);
    e.angle = (e.angle + 270) % 360;
    addClass(e, "rotate" + e.angle);
  }

  function addClass(e, className) {
    e.className += " " + className;
  }

  function removeClass(e, className) {
    e.className = e.className.replace(new RegExp("\\b" + className + "\\b","g"), "");
  }

  function rand(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  }

  var currentTiles;

  function newTiles(tiles) {
    saveFirst();
    
    tiles.forEach(function (it) {
      createCSSSelector(".tile" + it.hash, "background-image: url('" + it.uri + "')");
    });

    createPalete(tiles);
    create(0, 0);
    changed = false;

    currentTiles = tiles;
  }

  return {
    newTiles: newTiles
  };
}) ();

function $(id) {
  return document.getElementById(id);
}
