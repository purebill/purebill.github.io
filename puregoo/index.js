import saveAs from "./file-saver.js";
import Files from "./files.js";
import Keys from "./keys.js";
import Message from "./message.js";
import {Progress, Phase} from "./progress.js";
import Undo from "./undo.js";
import { Workerp } from "./workerp.js";

const WORKERS = navigator.hardwareConcurrency || 2;
const workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}
let currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

let gooOperators = ["push", "scale", "wave", "inverse", "undo"];

let state = {
  xc: 0,
  yc: 0,
  r: 50,
  scaleValue: 1/1.05,
  pushValue: 1,
  startXc: 0,
  startYc: 0,
  busy: false,
  action: false,
  interpolate: true,
  img: null,
  canvas: document.getElementById("result"),
  uiCanvas: document.getElementById("interface"),
  offlineCanvas: null,
  /**@type {Float64Array} */
  imgBuffer: null,
  imgOriginal: null,
  operatorIdx: 0,
  animate: false
};

document.onpaste = function (event) {
  var clipboardData, found;
  found = false;
  clipboardData = event.clipboardData;
  return clipboardData.types.forEach(function (type, i) {
    var file, reader;
    if (found) {
      return;
    }
    if (clipboardData.items[i].type.match(/^image\/png$/)) {
      file = clipboardData.items[i].getAsFile();
      reader = new FileReader();
      reader.onload = function (evt) {
        loadDataUri(evt.target.result);
      };
      reader.readAsDataURL(file);
      return (found = true);
    }
  });
}

Files.registerCallback(files => files.forEach(file => {
  if (!file) return;

  loadDataUri(file.uri);
}));

function loadDataUri(uri) {
  [...document.querySelectorAll(".result")].forEach(it => it.style.display = "block");
  [...document.querySelectorAll(".intro")].forEach(it => it.style.display = "none");

  loadImageData(uri, 1024, 1024)
  .then(function ([img, imgOriginal]) {
    state.canvas.width = img.width;
    state.canvas.height = img.height;
    state.uiCanvas.width = img.width;
    state.uiCanvas.height = img.height;

    state.imgBuffer = createBuffer(img);
    Undo.reset();

    state.xc = - img.width / 2;
    state.yc = - img.height / 2;
    state.r = Math.min(img.width, img.height) / 6;
    state.img = img;
    state.offlineCanvas = new OffscreenCanvas(img.width, img.height);
    state.imgOriginal = imgOriginal;
  })
  .then(applyGoo)
  .then(() => state.action = false);
}

function createBuffer(img) {
  let imgBuffer = new Float64Array(img.width * 2 * img.height);
  let i = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      imgBuffer[i++] = x;
      imgBuffer[i++] = y;
    }
  }
  return imgBuffer;
}

function createOriginalImgBuffer(progress) {
  const fromWidth = state.img.width;
  const fromHeight = state.img.height;
  const toWidth = state.imgOriginal.width;
  const toHeight = state.imgOriginal.height;
  
  let result = new Float64Array(toWidth * 2 * toHeight);
  const tiles = splitWH(toWidth, toHeight, 128);
  
  progress.add(tiles.length);

  return Promise.all(workers.map(it => it.call({imgBuffer: state.imgBuffer})))
  .then(() => Promise.all(
      tiles.map(tile => 
        worker().call({
          scaleImgBuffer: {fromWidth, fromHeight, toWidth, toHeight, tile}
        })
        .then(imgBufferPart => {
          progress.done(1);
          let si = 0;
          let di = 2*(tile.top * toWidth + tile.left);
          for (let y = 0; y < tile.height; y++) {
            for (let x = 0; x < tile.width; x++) {
              result[di++] = imgBufferPart[si++];
              result[di++] = imgBufferPart[si++];
            }
            di += 2*(toWidth - tile.width);
          }
        })
      )
    )
    .then(() => result)
  );
}

/**
 * @param {*} img 
 * @param {*} imgBuffer 
 * @param {*} canvas 
 * @param {*} offlineCanvas 
 * @param {Phase|void} progressPhase 
 */
function renderImage(img, imgBuffer, canvas, offlineCanvas, progressPhase) {
  const progress = progressPhase || Progress.NOOP;

  const tiles = split(img, 128);

  state.busy = true;

  const ctx = offlineCanvas ? offlineCanvas.getContext("2d") : canvas.getContext("2d");

  progress.add(tiles.length);
  return Promise.all(workers.map(it => it.call({img})))
    .then(() => Promise.all(workers.map(it => it.call({imgBuffer}))))
    .then(() => new Promise(resolve => {
      let c = 0;
      let start = new Date().getTime();

      tiles.forEach(tile => {
        worker()
          .call({tile, interpolation: state.interpolate})
          .then(part => {
            if (!part) return;

            ctx.putImageData(part, tile.left, tile.top);

            progress.done(1);
            if (++c == tiles.length) {
              // console.debug("rendered in " + (new Date().getTime() - start) / 1000.0 + " seconds");
              state.busy = false;
              progress.stop();
              resolve();
            }
          });
      });
    }))
    .then(() => {
      if (offlineCanvas) canvas.getContext("2d").drawImage(offlineCanvas, 0, 0);
    });
}

function applyOperator(img, offlineCanvas, imgBuffer, canvas, operator, params) {
  const tiles = split(img, 128);

  Progress.start();
  const operatorProgress = Progress.phase("operator");
  const renderImageProgress = Progress.phase("renderImage");

  operatorProgress.add(tiles.length);

  state.busy = true;

  return Promise.all(workers.map(it => it.call({imgBuffer})))
    .then(() => Promise.all(
      tiles.map(tile =>
        worker().call({tile, operator, ...params, interpolation: state.interpolate})
        .then(imgBufferPart => {
          let si = 0;
          let di = 2*(tile.top*img.width + tile.left);
          for (let y = 0; y < tile.height; y++) {
            for (let x = 0; x < tile.width; x++) {
              imgBuffer[di++] = imgBufferPart[si++];
              imgBuffer[di++] = imgBufferPart[si++];
            }
            di += 2*(img.width - tile.width);
          }
          operatorProgress.done(1);
        }))
    ))
    .then(() => state.busy = false)
    .then(() => renderImage(img, imgBuffer, canvas, offlineCanvas, renderImageProgress))
    .then(() => Progress.stop());
}

function applyGoo(prevBuffer) {
  if (!state.action) {
    renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas)
    .then(() => createUndo(prevBuffer));
    return;
  }
  
  applyOperator(state.img, 
    state.offlineCanvas,
    state.action ? state.imgBuffer : new Float64Array(state.imgBuffer),
    state.canvas,
    gooOperators[state.operatorIdx],
    {
      xc: state.xc,
      yc: state.yc,
      r: state.r,
      prevXc: state.prevXc,
      prevYc: state.prevYc,
      startXc: state.startXc,
      startYc: state.startYc,
      w: state.img.width,
      h: state.img.height,
      scaleValue: state.scaleValue,
      pushValue: state.pushValue
    })
  .then(() => createUndo(prevBuffer));
}

function createUndo(prevBuffer) {
  if (!prevBuffer) return;

  const beforeBuffer = new Float64Array(prevBuffer);
  const currentBuffer = new Float64Array(state.imgBuffer);
  let first = true;
  Undo.do({
    do: () => {
      if (first) {
        first = false;
        return;
      }
      state.imgBuffer = currentBuffer;
      return renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas);
    },
    undo: () => {
      state.imgBuffer = beforeBuffer;
      return renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas);
    }
  });
}

applyGoo = bounceIf(applyGoo, 300, () => state.busy);

function loadImageData(imageUrl, maxWidth, maxHeight) {
  return new Promise(function (resolve) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var img = document.createElement("img");
    img.onload = function () {
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = maxWidth/w * h;
        w = maxWidth;
      }
      if (h > maxHeight) {
        w = maxHeight/h * w;
        h = maxHeight;
      }
      w = Math.round(w);
      h = Math.round(h);
  
      canvas.width = w;
      canvas.height = h;
      context.drawImage(img, 0, 0, w, h);
      const imgSmall = context.getImageData(0, 0, w, h);

      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      const imgOriginal = context.getImageData(0, 0, img.width, img.height);

      resolve([imgSmall, imgOriginal]);
    };
    img.src = imageUrl;
  });
}

function split(img, S) {
  return splitWH(img.width, img.height, S);
}

function splitWH(width, height, S) {
  var tw = Math.ceil(width / S);
  var lastW = width % S;
  var th = Math.ceil(height / S);
  var lastH = height % S;

  var tiles = [];

  for (var row = 0; row < th; row++) {
    for (var col = 0; col < tw; col++) {
      tiles.push({
        left: col * S,
        top: row * S,
        width: col * S + S <= width ? S : lastW,
        height: row * S + S <= height ? S : lastH
      });
    }
  }

  return tiles;
}

const dx = 200;
const dy = 200;
let ctx;

Keys.init(state.uiCanvas);
Undo.reset();
// Undo.onChange(() => console.log(Undo.canUndo(), Undo.canRedo()));

Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
  let help = Keys.help();

  const snapshot = Keys.snapshot();
  Keys.resetToRoot();
  const close = () => {
    el.style.display = "none";
    Keys.restoreFromSnapshot(snapshot);
  }
  Keys.key("F1", [], "Hide Help", close);
  Keys.key("Escape", [], "Hide Help", close);

  let el = document.getElementById("message");

  if (el.style.display == "block") {
    el.style.display = "none";
    return;
  }

  el.innerHTML =
    "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
    "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

  el.style.display = "block";
});
Keys.push(); // root contains only 'Help' functionality

Keys.key("KeyZ", ["Ctrl"], "Undo", () => Undo.undo());
Keys.key("KeyY", ["Ctrl"], "Redu", () => Undo.redo());
let prevBuffer = null;
Keys.mouse(0, [], "Click and move to GOO",
  // Mouse up
  e => {
    state.action = false;

    state.xc = e.offsetX;
    state.yc = e.offsetY;

    state.interpolate = true;
    applyGoo(prevBuffer);
  },
  // Mouse down
  e => {
    state.interpolate = false;

    prevBuffer = new Float64Array(state.imgBuffer);

    state.animate = false;
    state.action = true;

    state.xc = e.offsetX;
    state.yc = e.offsetY;

    state.prevXc = state.startXc = state.xc;
    state.prevYc = state.startYc = state.yc;

    applyGoo();
  }
);
Keys.mouse(2, [], "Select value", e => {
  if (gooOperators[state.operatorIdx] == "scale") {
    selectValue(1/1.1, 1.1, state.scaleValue, e.offsetX, e.offsetY, v => "x " + (1/v).toFixed(2))
      .then(v => {
        state.scaleValue = v;
        showState();
      });
  }
  else if (gooOperators[state.operatorIdx] == "push") {
    selectValue(1, 10, state.pushValue, e.offsetX, e.offsetY, v => v.toFixed(2))
      .then(v => {
        state.pushValue = v;
        showState();
      });
  }
})
Keys.mouseMove([], "Move to apply the GOO", e => {
  if (state.animate) return;

  state.xc = e.offsetX;
  state.yc = e.offsetY;

  if (state.action) applyGoo();

  state.prevXc = state.xc;
  state.prevYc = state.yc;
  
  showState();
});
Keys.mouseLeave("Ends current edit", () => {
  state.action = false;
  state.interpolate = true;
  applyGoo(prevBuffer);
});
Keys.mouseZoom([], "Select the circle radius", e => {
  e.preventDefault();

  state.r = Math.max(5, state.r + 3 * e.deltaY / Math.abs(e.deltaY));
  
  if (state.action) applyGoo();
  
  showState();
});
Keys.key("KeyI", [], "Trigger interpolation",
  () => {
    state.interpolate = !state.interpolate;
    
    Message.show(state.interpolate ? "Interpolation ON" : "Interpolation OFF", 2000);

    applyGoo();
  }
);
Keys.key("KeyS", ["Ctrl"], "Save inverted original image", () => {
  Progress.start();
  const phase1 = Progress.phase("createOriginalImgBuffer");
  const phase2 = Progress.phase("renderImage");
  const phase3 = Progress.phase("save");

  createOriginalImgBuffer(phase1)
  .then(originalImgBuffer => {
    const canvas = document.createElement("canvas");
    canvas.width = state.imgOriginal.width;
    canvas.height = state.imgOriginal.height;

    renderImage(state.imgOriginal, originalImgBuffer, canvas, null, phase2)
    .then(() => new Promise(resolve => {
      phase3.add(1);
      canvas.toBlob(blob => {
        const saver = saveAs(blob, "puregoo-" + (new Date().getTime()) + ".jpg");
        saver.onwriteend = resolve;
        phase3.stop();
        Progress.stop();
      }, "image/jpeg", 0.9);
    }));
  });
});
Keys.key("KeyA", [], "Animate", () => {
  animate();
});
Keys.key("Space", [], "Select GOO", () => {
  if (!state.img) return;

  let menuItems = [];
  let menuItemSelected = state.operatorIdx;

  let snapshot = Keys.snapshot();
  Keys.resetToRoot();
  Keys.key("ArrowUp", [], "Up", () => {
    menuItemSelected = (menuItemSelected + menuItems.length - 1) % menuItems.length;
    menuItems[menuItemSelected].onmouseover({target: menuItems[menuItemSelected]});
  });
  Keys.key("ArrowDown", [], "Down", () => {
    menuItemSelected = (menuItemSelected + 1) % menuItems.length;
    menuItems[menuItemSelected].onmouseover({target: menuItems[menuItemSelected]});
  });
  const selectMenuItem = () => menuItems[menuItemSelected].onclick({target: menuItems[menuItemSelected]});
  Keys.key("Enter", [], "Select", selectMenuItem);
  Keys.key("Space", [], "Select", selectMenuItem);
  Keys.key("Escape", [], "Exit", () => {
    menuItems[menuItemSelected].onclick({gooCancelled: true});
  });

  let div = document.createElement("div");
  div.classList.add("modal");

  let menu = document.createElement("div");
  menu.classList.add("menu");
  for (let i = 0; i < gooOperators.length; i++) {
    const operator = gooOperators[i];
    let a = document.createElement("a");
    a.innerText = operator;
    a.onmouseover = e => {
      [...menu.querySelectorAll(".hover")].forEach(it => it.classList.remove("hover"));
      e.target.classList.add("hover");
    }
    a.onclick = e => {
      if (!e.gooCancelled) {
        state.operatorIdx = i;
        Message.show("GOO Selected: " + operator, 2000);
      }
      applyGoo();
      div.remove();
      menu.remove();
      Keys.restoreFromSnapshot(snapshot);
    }
    if (i == state.operatorIdx) a.classList.add("hover");
    menu.appendChild(a);
    menuItems.push(a);
  }
  document.body.appendChild(div);
  document.body.appendChild(menu);
});
Keys.key("Escape", [], "Undo all changes", () => {
  Undo.undoAll();
});

function showState() {
  const ctx = state.uiCanvas.getContext("2d");

  ctx.save();
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  let {xc, yc, r} = state;
  ctx.strokeStyle = "#000000";
  circle(ctx, xc, yc, r);
  ctx.strokeStyle = "#ffffff";
  circle(ctx, xc, yc, r - 1);
  ctx.restore();
}

function hideState() {
  const ctx = state.uiCanvas.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function bounceIf(f, t, predicate) {
  let id = null;

  return function () {
    const a = arguments;

    if (id !== null) window.clearTimeout(id);
    if (predicate()) {
      id = window.setTimeout(() => {
        id = null;
        f.apply(null, a);
      }, t);
    } else {
      f.apply(null, a);
    }
  }
}

function animate() {
  state.interpolate = false;
  hideState();
  let snapshot = Keys.snapshot();
  Keys.resetToRoot();
  Keys.key("Escape", [], "Exit animation", () => state.animate = false);
  Keys.key("KeyA", [], "Exit animation", () => state.animate = false);
  Keys.key("Space", [], "Exit animation", () => state.animate = false);
  Keys.mouse(0, [], "Exit animation", () => state.animate =false);

  state.animate = true;

  let lastTime = null;
  let period = 1000;
  let buffer = createBuffer(state.img);

  window.requestAnimationFrame(doAnimate);

  function doAnimate(t) {
    if (!state.animate) {
      state.interpolate = true;
      Keys.restoreFromSnapshot(snapshot);
      renderImage(state.img, state.imgBuffer, state.canvas);
      return;
    }

    let startTime = new Date().getTime();

    if (lastTime == null) lastTime = t;

    let past = t - lastTime;

    let p = (1 + Math.sin(2 * Math.PI * past / period))/2;
    let i = 0;
    for (let y = 0; y < state.img.height; y++) {
      for (let x = 0; x < state.img.width; x++) {
        let x1 = p*x + (1-p)*state.imgBuffer[i];
        let y1 = p*y + (1-p)*state.imgBuffer[i + 1];
        buffer[i++] = x1;
        buffer[i++] = y1;
      }
    }
  
    renderImage(state.img, buffer, state.canvas, state.offlineCanvas)
      // .then(() => console.log("frame in " + (new Date().getTime() - startTime) / 1000.0 + " seconds"))
      .then(() => window.requestAnimationFrame(doAnimate));
  }
}

function selectValue(from, to, current, initialX, initialY, toString) {
  return new Promise(resolve => {
    const snapshot = Keys.snapshot();
    Keys.resetToRoot();

    const height = 200;

    let value = current;
    Keys.mouseMove([], "Move to change the value", e => {
      value = current + (to - from)/height * (e.offsetY-initialY);
      value = Math.min(to, Math.max(from, value));

      drawSelection();
    });
  
    Keys.mouse(0, [], "Select", e => {
      Keys.restoreFromSnapshot(snapshot);
      resolve(value);
    });

    Keys.key("Escape", [], "Cancel selection", () => {
      Keys.restoreFromSnapshot(snapshot);
      resolve(current);
    });

    drawSelection();

    function drawSelection() {
      const ctx = state.uiCanvas.getContext("2d");
      ctx.save();
      
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      let fromy = (from - current)/(to - from)*height + initialY;
      let toy = (to - current)/(to - from)*height + initialY;
      let vy = (value - current)/(to - from)*height + initialY;

      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(initialX-1, fromy);
      ctx.lineTo(initialX-1, toy);
      ctx.stroke();
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(initialX, fromy);
      ctx.lineTo(initialX, toy);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.arc(initialX, vy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(initialX, vy, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeText(toString(value), initialX + 5, vy);
      ctx.fillText(toString(value), initialX + 5, vy);

      ctx.restore();
    }
  });
}

function modal(f) {
  const snapshot = Keys.snapshot();
  Keys.resetToRoot();
  const close = () => Keys.restoreFromSnapshot(snapshot);
  f().then(close);
}

loadDataUri("grid.jpg");