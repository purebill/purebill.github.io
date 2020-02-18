const WORKERS = navigator.hardwareConcurrency || 2;
const workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}
let currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

const state = {
  xc: 0,
  yc: 0,
  r: 50,
  tiles: null,
  busy: false,
  frozen: false,
  interpolate: false
};

Files.registerCallback(files => files.forEach(file => {
  if (!file) return;

  [...document.querySelectorAll(".result")].forEach(it => it.style.display = "block");
  [...document.querySelectorAll(".intro")].forEach(it => it.style.display = "none");

  loadImageData(file.uri, 1024, 1024).then(function (img) {
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
    state.tiles = split(img, 128);
    state.img = img;

    return result;
  }).then(result => invertLoadedImage(result))
  .then(() => state.frozen = false);
}));

function invertLoadedImage(canvas) {
  if (!state.tiles) return;

  state.busy = true;

  // workers.forEach(w => w.reset());

  return Promise.all(workers.map(it => it.call({img: state.img})))
      .then(() => {
        let c = 0;
        let start = new Date().getTime();
        state.tiles.forEach(tile => {
          worker()
            .call({tile, x: state.xc, y: state.yc, r: state.r, interpolation: state.interpolate})
            .then(part => {
              if (!part) return;
              drawImage(canvas, part, tile);
              if (++c == state.tiles.length) {
                // console.debug("finished in " + (new Date().getTime() - start) / 1000.0 + " seconds");
                state.busy = false;
              }
            });
        });
      });
}

invertLoadedImage = bounceIf(invertLoadedImage, 300, () => state.busy);

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
      resolve(context.getImageData(0, 0, w, h));
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
  invertLoadedImage(c);
});
Keys.mouseZoom([], "Select the circle radius", e => {
  if (state.frozen) return;

  e.preventDefault();
  state.r = Math.max(5, state.r + 10 * e.deltaY / Math.abs(e.deltaY));
  showState();
  invertLoadedImage(c);
});
Keys.key("KeyI", [], "Trigger interpolation",
  () => {
    state.interpolate = !state.interpolate;
    
    Message.show(state.interpolate ? "Interpolation ON" : "Interpolation OFF");
    window.setTimeout(() => Message.hide(), 2000);

    invertLoadedImage(c);
  }
);
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
/*c.onmousemove = e => {
  if (state.frozen) return;

  state.xc = e.offsetX;
  state.yc = e.offsetY;
  showState();
  invertLoadedImage(document.getElementById("result"));
};
c.onmousewheel = e => {
  if (state.frozen) return;

  e.preventDefault();
  state.r = Math.max(5, state.r + 10 * e.deltaY / Math.abs(e.deltaY));
  showState();
  invertLoadedImage(document.getElementById("result"));
}
c.onclick = () => state.frozen = !state.frozen;*/

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

function init(w, h) {
  c.width = w;
  c.height = h;
  ctx = c.getContext("2d");
  ctx.translate(dx, dy);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  clear();
}

function clear() {
  ctx.clearRect(-dx, -dy, c.width, c.height);
  circle(0, 0, r);
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