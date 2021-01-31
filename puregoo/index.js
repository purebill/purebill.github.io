import { diff } from "./diff.js";
import saveAs from "./file-saver.js";
import Files from "./files.js";
import Keys from "./keys.js";
import { menu } from "./menu.js";
import Message from "./message.js";
import { Progress, Phase } from "./progress.js";
import { selectValue } from "./select-value.js";
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

const gooOperators = ["push", "scale", "wave", "inverse", "undo"];

const state = {
  xc: 0,
  yc: 0,
  r: 50,
  scaleValue: 1/1.05,
  pushValue: 1,
  prevXc: 0,
  prevYc: 0,
  startXc: 0,
  startYc: 0,
  busy: false,
  action: false,
  interpolate: true,
  /**@type {ImageData} */
  img: null,
  /**@type {HTMLCanvasElement} */
  // @ts-ignore
  canvas: document.getElementById("result"),
  /**@type {HTMLCanvasElement} */
  // @ts-ignore
  uiCanvas: document.getElementById("interface"),
  offlineCanvas: null,
  /**@type {Float64Array} */
  imgBuffer: null,
  /**@type {ImageData} */
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
        // @ts-ignore
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

/**
 * @param {string} uri
 */
async function loadDataUri(uri) {
  // @ts-ignore
  [...document.querySelectorAll(".result")].forEach(it => it.style.display = "block");
  // @ts-ignore
  [...document.querySelectorAll(".intro")].forEach(it => it.style.display = "none");

  const [img, imgOriginal] = await loadImageData(uri, 1024, 1024);
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
  
  await applyGoo();

  state.action = false;
}

/**
 * @param {ImageData} img
 */
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

/**
 * @param {Phase} progress
 */
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
      tiles.map(/**
         * @param {number[]} imgBufferPart
         */
tile => 
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
 * @returns {Promise<void>}
 */
async function renderImage(img, imgBuffer, canvas, offlineCanvas, progressPhase) {
  const progress = progressPhase || Progress.NOOP;

  const tiles = split(img, 128);

  state.busy = true;

  const ctx = offlineCanvas ? offlineCanvas.getContext("2d") : canvas.getContext("2d");

  progress.add(tiles.length);

  await Promise.all(workers.map(it => it.call({img})));

  await Promise.all(workers.map(it => it.call({imgBuffer})));

  await Promise.all(
    tiles.map(/**
       * @param {any} part
       */
tile => worker()
      .call({ tile, interpolation: state.interpolate })
      .then(part => {
        ctx.putImageData(part, tile.left, tile.top);
        progress.done(1);
      }))
  );

  if (offlineCanvas) canvas.getContext("2d").drawImage(offlineCanvas, 0, 0);
  progress.stop();
  state.busy = false;
}

/**
 * @param {ImageData} img
 * @param {HTMLCanvasElement} offlineCanvas
 * @param {Float64Array} imgBuffer
 * @param {HTMLCanvasElement} canvas
 * @param {string} operator
 * @param {{ xc: number; yc: number; r: number; prevXc: any; prevYc: any; startXc: number; startYc: number; w: number; h: number; scaleValue: number; pushValue: number; }} params
 * @returns {Promise<void>}
 */
async function applyOperator(img, offlineCanvas, imgBuffer, canvas, operator, params) {
  const tiles = split(img, 128);

  const progress = new Progress(document.getElementById("progress"));
  progress.start();
  const operatorProgress = progress.phase("operator");
  const renderImageProgress = progress.phase("renderImage");

  operatorProgress.add(tiles.length);

  state.busy = true;

  await Promise.all(workers.map(it => it.call({imgBuffer})));

  await Promise.all(
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
  );

  await renderImage(img, imgBuffer, canvas, offlineCanvas, renderImageProgress);

  state.busy = false;
  progress.stop();
}

/**
 * @param {Float64Array | void} [prevBuffer]
 */
async function applyGoo(prevBuffer) {
  if (!state.action) {
    await renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas)
    createUndo(prevBuffer);
    prevBuffer = null;
    return;
  }

  const params = {
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
  };

  await applyOperator(state.img, 
    state.offlineCanvas,
    state.action ? state.imgBuffer : new Float64Array(state.imgBuffer),
    state.canvas,
    gooOperators[state.operatorIdx],
    params
  );

  createUndo(prevBuffer);
  prevBuffer = null;
}

/**
 * @param {Float64Array | void} prevBuffer
 */
function createUndo(prevBuffer) {
  if (!prevBuffer) return;

  const beforeBuffer = new Float64Array(prevBuffer);
  const currentBuffer = new Float64Array(state.imgBuffer);

  let patches = diff(beforeBuffer, currentBuffer, state.img.width, state.img.height);
  
  // const ctx = state.uiCanvas.getContext("2d");
  // ctx.save();
  // ctx.strokeStyle = "#00ff00";
  // patches.forEach(patch => {
  //   ctx.beginPath();
  //   ctx.rect(patch.left, patch.top, patch.width, patch.height);
  //   ctx.stroke();
  // });
  // ctx.restore();

  let first = true;
  Undo.do({
    do: () => {
      if (first) {
        first = false;
        return;
      }
      patches.forEach(patch => patch.apply(state.imgBuffer, state.img.width, true));
      // state.imgBuffer = currentBuffer;
      return renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas);
    },
    undo: () => {
      patches.forEach(patch => patch.apply(state.imgBuffer, state.img.width, false));
      // state.imgBuffer = beforeBuffer;
      return renderImage(state.img, state.imgBuffer, state.canvas, state.offlineCanvas);
    }
  });
}

/**
 * @param {string} imageUrl
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @returns {Promise<[ImageData, ImageData]>}
 */
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

/**
 * @param {ImageData} img
 * @param {number} S
 * @returns {{left: number, top: number, width: number, height: number}[]}
 */
function split(img, S) {
  return splitWH(img.width, img.height, S);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} S
 * @returns {{left: number, top: number, width: number, height: number}[]}
 */
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

const applyGooBounced = bounceIf(applyGoo, 300, () => state.busy);

Keys.key("KeyZ", ["Ctrl"], "Undo", () => Undo.undo());
Keys.key("KeyY", ["Ctrl"], "Redu", () => Undo.redo());
let prevBuffer = null;
Keys.mouse(0, [], "Click and move to GOO",
  // Mouse up
  e => {
    if (!state.action) return;

    state.action = false;

    state.xc = e.offsetX;
    state.yc = e.offsetY;

    state.interpolate = true;
    applyGooBounced(prevBuffer);
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

    applyGooBounced();
  }
);
Keys.mouse(2, [], "Select value", e => {
  if (gooOperators[state.operatorIdx] == "scale") {
    selectValue(1/1.1, 1.1, state.scaleValue, e.offsetX, e.offsetY, v => "x " + (1/v).toFixed(2), state.uiCanvas)
      .then(v => {
        state.scaleValue = v;
        showState();
      });
  }
  else if (gooOperators[state.operatorIdx] == "push") {
    selectValue(1, 10, state.pushValue, e.offsetX, e.offsetY, v => v.toFixed(2), state.uiCanvas)
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

  if (state.action) applyGooBounced();

  state.prevXc = state.xc;
  state.prevYc = state.yc;
  
  showState();
});
Keys.mouseLeave("Ends current edit", () => {
  if (!state.action) return;

  state.action = false;
  state.interpolate = true;
  applyGooBounced(prevBuffer);
});
Keys.mouseZoom([], "Select the circle radius", e => {
  e.preventDefault();

  state.r = Math.max(5, state.r + 3 * e.deltaY / Math.abs(e.deltaY));
  
  if (state.action) applyGooBounced();
  
  showState();
});
Keys.key("KeyI", [], "Trigger interpolation",
  () => {
    state.interpolate = !state.interpolate;
    
    Message.show(state.interpolate ? "Interpolation ON" : "Interpolation OFF", 2000);

    applyGoo();
  }
);
Keys.key("KeyS", ["Ctrl"], "Save inverted original image", async () => {
  const progress = new Progress(document.getElementById("progress"));
  progress.start();
  const phase1 = progress.phase("createOriginalImgBuffer");
  const phase2 = progress.phase("renderImage");
  const phase3 = progress.phase("save");

  const originalImgBuffer = await createOriginalImgBuffer(phase1);

  const canvas = document.createElement("canvas");
  canvas.width = state.imgOriginal.width;
  canvas.height = state.imgOriginal.height;

  await renderImage(state.imgOriginal, originalImgBuffer, canvas, null, phase2);

  await new Promise(resolve => {
      phase3.add(1);
      canvas.toBlob(blob => {
        const saver = saveAs(blob, "puregoo-" + (new Date().getTime()) + ".jpg");
        //@ts-ignore
        saver.onwriteend = () => {
          phase3.stop();
          resolve();
        }
      }, "image/jpeg", 0.9);
  });

  progress.stop();
});
Keys.key("KeyA", [], "Animate", animate);
Keys.key("Space", [], "Select GOO", async () => {
  if (!state.img) return;

  const i = await menu(gooOperators, state.operatorIdx);
  state.operatorIdx = i;
  Message.show("GOO Selected: " + gooOperators[i], 2000);
});
Keys.key("Escape", [], "Undo all changes", Undo.undoAll);

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

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 */
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/**
 * @param {{ beginPath: () => void; moveTo: (arg0: any, arg1: any) => void; lineTo: (arg0: any, arg1: any) => void; stroke: () => void; }} ctx
 * @param {any} x1
 * @param {any} y1
 * @param {any} x2
 * @param {any} y2
 */
function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * @param {(any) => any} f
 * @param {number} t
 * @param {() => boolean} predicate
 */
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

  /**
   * @param {number} t
   */
  async function doAnimate(t) {
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
  
    await renderImage(state.img, buffer, state.canvas, state.offlineCanvas);
    //console.log("frame in " + (new Date().getTime() - startTime) / 1000.0 + " seconds");
    window.requestAnimationFrame(doAnimate);
  }
}

// loadDataUri("grid.jpg")
// .then(async () => {
//   state.startXc = state.xc = state.img.width / 2;
//   state.prevXc = state.startYc = state.yc = state.img.height / 2;
//   state.operatorIdx = 1;
//   state.scaleValue = 1/2;
//   state.action = true;
//   state.interpolate = false;
//   const prevBuffer = new Float64Array(state.imgBuffer);
//   for (let i = 0; i < 10; i++) {
//     await applyGoo();
//     state.prevXc = state.xc;
//     state.prevYc = state.yc;
//     if (i < 5) state.yc += 20;
//     else state.xc += 20;
//     // state.xc = Math.random() * state.img.width;
//     // state.yc = Math.random() * state.img.height;
//   }
//   state.action = false;
//   state.interpolate = true;
//   await applyGoo(prevBuffer);
// });