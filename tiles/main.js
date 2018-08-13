"use strict";

var container = document.getElementById("container");

var cntrlIsPressed = false;
document.onkeydown = function (event) {
  if (event.which=="17") {
    cntrlIsPressed = true;
  }
};
document.onkeyup = function () {
  cntrlIsPressed = false;
}

$("apply").onclick = function () {
  saveFirst();
  currentName = undefined;
  create(parseInt($("N").value), parseInt($("M").value));
}

$("save").onclick = function () {
  var name = prompt("Имя", currentName);
  if (name != null) {
    currentName = name;
    var state = getState();
    localStorage.setItem(name, state);
    Firebase.save(name, state);
    changed = false;
    loadStates();
  }
}

$("saved").onchange = function () {
  var key = this.value;

  if (key != "") {
    saveFirst();

    if (this.options[this.selectedIndex].firebase) {
      Firebase.load(key, function (cells) {
        restoreState(cells);
        loadStates();
        currentName = key;
      });
    } else {
      var cells = JSON.parse(localStorage[key]);
      restoreState(cells);
      loadStates();
      currentName = key;
    }
  }
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
  div.innerHTML = Object.keys(table)
    .map(function (it) {
      return "<div class='tile" + it + "'><span>" + table[it] + "</span></div>";
    })
    .join("\n");
};

$("calculations").onclick = function () {
  $("calculations").style.display = "none";
};

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
loadStates();
createPalete(30);
$("apply").onclick();

function saveFirst() {
  if (changed) {
    var doSave = window.confirm("Сохранить текущий?");
    if (doSave) {
      $("save").onclick();
    }
  }
}

function onResize(e) {
  $("main").style.width = (window.innerWidth - 120).toString() + "px";
  $("main").style.height = (window.innerHeight - 50).toString() + "px";
  $("tiles").style.height = (window.innerHeight - 50).toString() + "px";
}

function createPalete(n) {
  for (var i = 1; i <= n; i++) {
    var div = document.createElement("div");
    var idx = i < 10 ? "0" + i.toString() : i.toString();
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
        var idx = rand(1, 29);
        idx = idx < 10 ? "0" + idx.toString() : idx.toString();
        angle = 0;
      } else {
        idx = cells[row][i].idx;
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
  return JSON.stringify(cells);
}

function restoreState(cells) {
  var rows = cells.length;
  var cols = cells[0].length;
  $("N").value = rows;
  $("M").value = cols;
  create(cols, rows, cells);
  Undo.reset();
}

function loadStates() {
  var select = $("saved");
  select.innerHTML = "<option value='' selected>Загрузить</option>";
  Object.keys(localStorage).forEach(function (key) {
    var option = document.createElement("option");
    option.value = key;
    option.innerHTML = key;
    select.appendChild(option);
  });

  var localKeys = Object.keys(localStorage);
  Firebase.loadKeys(function (keys) {
    keys.forEach(function (key) {
      if (localKeys.indexOf(key) != -1) return;

      var option = document.createElement("option");
      option.firebase = true;
      option.value = key;
      option.innerHTML = key;
      select.appendChild(option);
    });
  });
}

function updateUndo() {
  $("undo").disabled = !Undo.canUndo();
  $("redo").disabled = !Undo.canRedo();
}

function $(id) {
  return document.getElementById(id);
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