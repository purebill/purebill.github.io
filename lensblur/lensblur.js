/*var s = 17;
var k = 1;

var kernel = createKernel(s, s,
  function (x, y) {
    return Math.sqrt((x - 0.5) * (x - 0.5) + (y - 0.5) * (y - 0.5)) <= 0.5 ? 1 : 0;
  },
  k);

var kernelGaus = createKernel(s, s,
  function (x, y) {
    return Math.exp(-(x - 0.5) * (x - 0.5) - (y - 0.5) * (y - 0.5));
  },
  k);*/

var WORKERS = navigator.hardwareConcurrency || 2;
var workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}
var currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

Files.registerCallback(files => files.forEach(file => blur(file)));

var lastFile;

function blur(file) {
  lastFile = file;
  let kernelFun = new Function("x", "y", "return " + $("kernel").value + ";");
  let kernelSize = parseInt($("kernelSize").value);
  let kernelMultiplier = parseFloat($("kernelMultiplier").value);

  let kernel = createKernel(kernelSize, kernelSize, kernelFun, kernelMultiplier);
  drawKernel(kernel);

  if (!file) return;

  loadImageData(file.uri).then(function (img) {
    var original = document.getElementById("original");
    original.width = img.width;
    original.height = img.height;
    drawImage(original, img, {left: 0, top: 0, width: img.width, height: img.height});

    var result = document.getElementById("result");
    result.width = img.width;
    result.height = img.height;

    Promise.all(workers.map(it => it.call({img, id: 1}))).then(_ => {
      let c = 0;
      let start = new Date().getTime();
      let tiles = split(img, 128);
      tiles.forEach(tile => {
        worker()
          .call({imgId: 1, tile, kernel: kernel})
          .then(part => {
            drawImage(result, part, tile);
            if (++c == tiles.length) {
              console.debug("finished in " + (new Date().getTime() - start) / 1000.0 + " seconds");
            }
          });
      });
    });
  });
}

function drawKernel(kernel) {
  var c = $("kernelCanvas");
  c.width = kernel.width;
  c.height = kernel.height;

  var img = new ImageData(kernel.width, kernel.height);

  let min = null;
  let max = null;
  for (let col = 0; col < kernel.width; col++) {
    for (let row = 0; row < kernel.height; row++) {
      let v = kernel.data[col + row * kernel.width];
      if (min === null || v < min) min = v;
      if (max === null || v > max) max = v;
    }
  }

  for (let col = 0; col < kernel.width; col++) {
    for (let row = 0; row < kernel.height; row++) {
      let v = Math.round((kernel.data[col + row * kernel.width] - min) / (max - min) * 255);

      let index = (col + row * kernel.width) * 4;
      img.data[index] = v;
      img.data[index + 1] = v;
      img.data[index + 2] = v;
      img.data[index + 3] = 255;
    }
  }

  drawImage(c, img, {left: 0, top: 0});
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

function drawImage(canvas, img, tile) {
  var ctx = canvas.getContext("2d");
  ctx.putImageData(img, tile.left, tile.top);
}

function createKernel(kW, kH, kF, factor) {
  var kernel = [];
  var sum = 0;
  for (var col = 0; col < kW; col++) {
    for (var row = 0; row < kH; row++) {
      var v = kF(col / (kW - 1), row / (kH - 1));
      kernel[row * kW + col] = v;
      sum += v;
    }
  }

  for (col = 0; col < kW; col++) {
    for (row = 0; row < kH; row++) {
      kernel[row * kW + col] /= sum / factor;
    }
  }

  return {
    width: kW,
    height: kH,
    data: kernel
  };
}

function loadImageData(imageUrl) {
  return new Promise(function (resolve) {
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var img = document.createElement("img");
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      resolve(context.getImageData(0, 0, img.width, img.height));
    };
    img.src = imageUrl;
  });
}

function $ (id) { return document.getElementById(id); }