let randomGenerator = new Random();

let state = {
  roughness: 0.7,
  amplitude: 0.3,
  maxLevel: 10,
  layers: 30,
  spacing: 0.01,
  shift: 0,
  scale: 1,
  wobbliness: 0,
  seed: randomGenerator.seed,
  bgColor: "#ffffff",
  color1: "#000000",
  color2: "#ffffff",
  colorShift: 0,
  stroke: true,
  fill: true,
  lineWidth: 0.5,
  haze: false,
  sunCount: 10,
  sunPoints: 100,
  sunSize: 0.1,
  sunOpacity: 1.0,
  sunColor1: "#000000",
  sunColor2: "#ffffff",
  sunColorShift: 0,
  skyColor1: "#ffffff",
  skyColor2: "#ffffff",
  skyColorShift: 0,
  frameColor: "#aaaaaa",
  frameWidth: 0,
  frameSpacing: 0,
  offsetX: 0,
  offsetY: 0,
  closeLines: true
};

let defaultState = {};
for (let key in state) defaultState[key] = state[key];

function getState() {
  return state;
}

function renderPreview() {
  let canvas = $("canvas");
  render(canvas, state, 1, 1);
}

function setState(newState) {
  for (k in newState) {
    state[k] = newState[k];
  }
  randomGenerator = new Random(state.seed);
  updateUi();
  renderPreview();
}

if (!State.init(getState, setState)) {
  updateUi();
  renderPreview();
}

function $(id) {
  return document.getElementById(id);
}

function updateUiAndRender() {
  randomGenerator = new Random(state.seed);
  updateUi();
  State.clear();
  renderPreview();
}

function updateStateAndRender() {
  randomGenerator = new Random(state.seed);

  document.querySelectorAll("input[type=range]").forEach(it => {
    let type = it.dataset.type;
    switch (type) {
      case "float":
        state[it.id] = parseFloat(it.value);
        break;
      default:
        state[it.id] = parseInt(it.value);
        break;
    }
  });

  document.querySelectorAll("input[type=color]").forEach(it => {
    state[it.id] = it.value;
  });

  document.querySelectorAll("input[type=checkbox]").forEach(it => {
    state[it.id] = it.checked;
  });

  State.clear();
  renderPreview();
}

function updateUi() {
  document.querySelectorAll("input[type=range]").forEach(it => {
    $(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=color]").forEach(it => {
    $(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=checkbox]").forEach(it => {
    $(it.id).checked  = state[it.id];
  });
}

function saveToFile() {
  const sourceCanvas = $("canvas");
  const canvas = document.createElement("canvas");

  canvas.width = 1920;
  canvas.height = sourceCanvas.height / sourceCanvas.width * canvas.width;

  let scale = canvas.width / sourceCanvas.width;

  randomGenerator = new Random(state.seed);
  render(canvas, state, scale)
    .then(canvasToBlob)
    .then(blob => saveAs(blob, state.seed + ".jpg"));
}

function canvasToBlob(canvas) {
  return new Promise(resolve => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
  });
}

$("save").onclick = saveToFile;

$("reset").onclick = () => {
  State.clear();

  let randomGenerator = new Random();
  state.seed = randomGenerator.seed;

  updateStateAndRender();
};

document.querySelectorAll("input[type=range]").forEach(it => it.oninput = updateStateAndRender);
document.querySelectorAll("input[type=color]").forEach(it => it.onchange = updateStateAndRender);
document.querySelectorAll("input[type=checkbox]").forEach(it => it.onchange = updateStateAndRender);
document.querySelectorAll("input").forEach(it => {
    it.ondblclick = (e) => {
      it.value = defaultState[it.id];
      updateStateAndRender();

      e.preventDefault();
    };
});

$("swapColors").onclick = () => {
  var color1 = $("color1");
  var color2 = $("color2");

  let tmp = color1.value;
  color1.value = color2.value;
  color2.value = tmp;

  updateStateAndRender();
};

$("createLink").onclick = () => {
  let l = window.location;
  let url = l.protocol + "//" + l.host + l.pathname + "#" + State.getState();
  Clipboard.copy(url);
};


var moving = false;
var x1, y1;
$("canvas").onmousedown = e => {
  if (moving) return;
  x1 = e.offsetX - state.offsetX;
  y1 = e.offsetY - state.offsetY;
  moving = true;
};

$("canvas").onmousemove = e => {
  if (moving) {
    var x2 = e.offsetX;
    var y2 = e.offsetY;

    state.offsetX = x2 - x1;
    state.offsetY = y2 - y1;

    updateUiAndRender();
  }
};

$("canvas").onmouseup = e => moving = false;

var mousewheelevt = (/Firefox/i.test(navigator.userAgent))
  ? "DOMMouseScroll"
  : "mousewheel";

if (window.attachEvent) 
  $("canvas").attachEvent("on" + mousewheelevt, onmousewheel);
else if (window.addEventListener) 
  $("canvas").addEventListener(mousewheelevt, onmousewheel, false);

function onmousewheel(e) {
  var zoomIn = e.detail ? e.detail < 0 : e.deltaY < 0;
  state.scale = Math.max(0, state.scale + (zoomIn ? 0.03 : -0.03));
  updateUiAndRender();
  e.preventDefault();
}
