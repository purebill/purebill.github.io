const WORKERS = navigator.hardwareConcurrency || 2;
const workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}
let currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

let state = {
  xc: 0,
  yc: 0,
  r: 50,
  multiplier: [2.0, 0.0],
  busy: false,
  frozen: false,
  interpolate: true,
  img: null,
  imgOriginal: null
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
      const type2 = clipboardData.items[i].type;
      reader = new FileReader();
      reader.onload = function (evt) {
        // console.log({
        //   type,
        //   type2,
        //   dataURL: evt.target.result,
        //   event: evt,
        //   file: file,
        //   name: file.name
        // });
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
    var original = document.getElementById("original");
    original.width = img.width;
    original.height = img.height;
    drawImage(original, img, {left: 0, top: 0, width: img.width, height: img.height});

    var result = document.getElementById("result");
    result.width = img.width;
    result.height = img.height;

    state.xc = img.width / 2;
    state.yc = img.height / 2;
    state.r = Math.min(img.width, img.height) / 6;
    state.img = img;
    state.imgOriginal = imgOriginal;
  })
  .then(() => drawMappedImage())
  .then(() => state.frozen = false);
}

function mapImage(img, canvas) {
  const tiles = split(img, 128);

  state.busy = true;

  return Promise.all(workers.map(it => it.call({img})))
    .then(() => new Promise(resolve => {
      let c = 0;
      let start = new Date().getTime();

      const timerId = window.setInterval(() => {
        const percent = Math.round(c/tiles.length*100);
        const div = document.getElementById("progress");
        div.style.display = "block";
        div.innerText = percent + "%";
      }, 500);

      tiles.forEach(tile => {
        worker()
          .call({tile, x: state.xc, y: state.yc, r: state.r, multiplier: state.multiplier, interpolation: state.interpolate})
          .then(part => {
            if (!part) return;
            drawImage(canvas, part, tile);
            if (++c == tiles.length) {
              // console.debug("finished in " + (new Date().getTime() - start) / 1000.0 + " seconds");
              state.busy = false;
              window.clearInterval(timerId);
              document.getElementById("progress").style.display = "none";
              resolve();
            }
          });
      });
    }));
}

function drawMappedImage() {
  mapImage(state.img, c);
}

drawMappedImage = bounceIf(drawMappedImage, 300, () => state.busy);

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

function drawImage(canvas, img, tile) {
  var ctx = canvas.getContext("2d");
  ctx.putImageData(img, tile.left, tile.top);
}

function split(img, S) {
  var tw = Math.ceil(img.width / S);
  var lastW = img.width % S;
  var th = Math.ceil(img.height / S);
  var lastH = img.height % S;

  var tiles = [];

  for (var row = 0; row < th; row++) {
    for (var col = 0; col < tw; col++) {
      tiles.push({
        left: col * S,
        top: row * S,
        width: col * S + S <= img.width ? S : lastW,
        height: row * S + S <= img.height ? S : lastH
      });
    }
  }

  return tiles;
}

const dx = 200;
const dy = 200;
let ctx;

const c = document.getElementById("result");
Keys.init(c);
Keys.mouse(0, [], "Click to trigger motion tracking", null,
  () => state.frozen = !state.frozen);
Keys.mouseMove([], "Select the inversion center", e => {
  if (state.frozen) return;

  state.xc = e.offsetX;
  state.yc = e.offsetY;

  showState();
  drawMappedImage();
});
Keys.mouseZoom([], "Select the circle radius", e => {
  if (state.frozen) return;

  e.preventDefault();

  state.r = Math.max(5, state.r + 10 * e.deltaY / Math.abs(e.deltaY));
  
  showState();
  drawMappedImage();
});
Keys.key("KeyI", [], "Trigger interpolation",
  () => {
    state.interpolate = !state.interpolate;
    
    Message.show(state.interpolate ? "Interpolation ON" : "Interpolation OFF");
    window.setTimeout(() => Message.hide(), 2000);

    drawMappedImage();
  }
);
Keys.key("KeyS", ["Ctrl"], "Save inverted original image", () => {
  const oldState = Object.assign({}, state);

  const zoomFactor = state.imgOriginal.width / state.img.width;
  state.r  *= zoomFactor;
  state.xc *= zoomFactor;
  state.yc *= zoomFactor;

  const canvas = document.createElement("canvas");
  canvas.width = state.imgOriginal.width;
  canvas.height = state.imgOriginal.height;

  mapImage(state.imgOriginal, canvas)
  .then(() => new Promise(resolve => {
    canvas.toBlob(blob => {
      const saver = saveAs(blob, "inversion-" + (new Date().getTime()) + ".jpg");
      saver.onwriteend = resolve;
    }, "image/jpeg", 0.9);
  }))
  .then(() => state = oldState);
});
Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
  let el = document.getElementById("message");

  if (el.style.display == "block") {
    el.style.display = "none";
    return;
  }

  let help = Keys.help();
  el.innerHTML =
    "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
    "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

  el.style.display = "block";
});

function showState() {
  circle(c.getContext("2d"), state.xc, state.yc, state.r);
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