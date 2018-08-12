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
    localStorage.setItem(name, getState());
    loadStates();
  }
}

$("saved").onchange = function () {
  var key = this.value;

  if (key != "") {
    saveFirst();
    var cells = JSON.parse(localStorage[key]);
    restoreState(cells);
    loadStates();
    currentName = key;
  }
}

window.onbeforeunload = function (e) {
  var message = "Не сохранено. Всё равно уйти?";

  if (!changed) message = null;

  e = e || window.event;
  // For IE and Firefox
  if (e) {
    e.returnValue = message;
  }

  // For Safari
  return message;
};

var selectedIdx;
var currentName;
var changed = false;

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

function createPalete(n) {
  for (var i = 1; i <= n; i++) {
    var div = document.createElement("div");
    var idx = i < 10 ? "0" + i.toString() : i.toString();
    div.className = "tile" + idx;
    div.idx = idx;
    div.id = div.className;
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

  $("container").style.width = ((N + 1) * 64 + 1) + "px";
  $("container").innerHTML = "";
  wall = [];

  for (var row = 0; row < M; row++) {
    wall[row] = [];
    
    var span = document.createElement("span");

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
      div.onclick = function () {
        if (!selectedIdx || selectedIdx == this.idx) {
          rotate(this);
          changed = true;
          return;
        }
        
        if (selectedIdx) {
          this.idx = selectedIdx;
          this.className = "tile" + selectedIdx;
          changed = true;
        }
      };
      container.appendChild(div);

      wall[row][i] = div;
    }
  }
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

function addClass(e, className) {
  e.className += " " + className;
}

function removeClass(e, className) {
  e.className = e.className.replace(new RegExp("\\b" + className + "\\b","g"), "");
}

function rand(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}