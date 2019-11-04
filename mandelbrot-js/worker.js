/* global Complex: false */
/* global Workerp: false */

importScripts(
  "workerp.js",
  "complex.js",
  "color.js"
);

var width, height, c1, c2, c0, colors;

function computeImage(x1, y1, x2, y2, steps) {
  var w = x2 - x1 + 1;
  var h = y2 - y1 + 1;

  var imd = new ImageData(w, h);

  var color = { r: 0, g: 0, b: 0 };
  var iterations;
  var c;
  var xi, yi;
  for (var x = x1; x <= x2; x++) {
    for (var y = y1; y <= y2; y++) {
      c = Complex.fromImage(x, y, c1, c2, width, height);

      iterations = mOptimized(c, steps);
      color = colors[iterations];

      xi = x - x1;
      yi = y - y1;
      imd.data[(xi + yi * w) * 4 + 0] = color.r;
      imd.data[(xi + yi * w) * 4 + 1] = color.g;
      imd.data[(xi + yi * w) * 4 + 2] = color.b;
      imd.data[(xi + yi * w) * 4 + 3] = 255;
    }
  }

  return imd;
}

function computeImage2(w, h, steps, stochastic) {
  var imd = new ImageData(w, h);

  if (stochastic)
    computeAreaStochastic(0, 0, w - 1, h - 1, steps, 0, 0, w, h, imd);
  else 
    computeArea(0, 0, w - 1, h - 1, steps, 0, 0, w, h, imd);

  return imd;
}

var minDx = 8;
var minDy = 8;

function computeArea(x1, y1, x2, y2, steps, x10, y10, w, h, imd) {
  var dx = Math.abs(x2 - x1) + 1;
  var dy = Math.abs(y2 - y1) + 1;
  if (dx < minDx || dy < minDy) {
    computeAreaIter(x1, y1, x2, y2, steps, x10, y10, w, h, imd);
  } else {
    var result1 = computeLine(x1, y1, x2, steps, x10, y10, w, h, imd);
    var result2 = computeLine(x1, y2, x2, steps, x10, y10, w, h, imd);
    var result3 = computeRow(x1, y1 + 1, y2 - 1, steps, x10, y10, w, h, imd);
    var result4 = computeRow(x2, y1 + 1, y2 - 1, steps, x10, y10, w, h, imd);
    var same = result1.same && result2.same && result3.same && result4.same;

    x1++;
    y1++;
    x2--;
    y2--;

    if (same && result1.iterations == steps) {
      fillArea(x1, y1, x2, y2, x10, y10, colors[result1.iterations], w, h, imd);
    } else {
      var midX = (x1 + x2) >> 1;
      var midY = (y1 + y2) >> 1;

      computeArea(x1, y1, midX, midY, steps, x10, y10, w, h, imd);
      computeArea(midX + 1, y1, x2, midY, steps, x10, y10, w, h, imd);
      computeArea(midX + 1, midY + 1, x2, y2, steps, x10, y10, w, h, imd);
      computeArea(x1, midY + 1, midX, y2, steps, x10, y10, w, h, imd);
    }
  }
}

function fillArea(x1, y1, x2, y2, x10, y10, color, w, h, imd) {
  var xi, yi;
  for (var x = x1; x <= x2; x++) {
    for (var y = y1; y <= y2; y++) {
      xi = x - x10;
      yi = y - y10;
      imd.data[(xi + yi * w) * 4 + 0] = color.r;
      imd.data[(xi + yi * w) * 4 + 1] = color.g;
      imd.data[(xi + yi * w) * 4 + 2] = color.b;
      imd.data[(xi + yi * w) * 4 + 3] = 255;
    }
  }
}

function computeLine(x1, y, x2, steps, x10, y10, w, h, imd) {
  var result = { same: true };
  var c, iterations, color, xi, yi;
  for (var x = x1; x <= x2; x++) {
    c = Complex.fromImage(x, y, c1, c2, width, height);

    iterations = mOptimized(c, steps);
    if (typeof result.iterations == "undefined") {
      result.iterations = iterations;
    }
    result.same = result.same && (iterations == result.iterations);

    color = colors[iterations];

    xi = x - x10;
    yi = y - y10;
    imd.data[(xi + yi * w) * 4 + 0] = color.r;
    imd.data[(xi + yi * w) * 4 + 1] = color.g;
    imd.data[(xi + yi * w) * 4 + 2] = color.b;
    imd.data[(xi + yi * w) * 4 + 3] = 255;
  }

  return result;
}

function computeRow(x, y1, y2, steps, x10, y10, w, h, imd) {
  var result = { same: true };
  var c, iterations, color, xi, yi;
  for (var y = y1; y <= y2; y++) {
    c = Complex.fromImage(x, y, c1, c2, width, height);

    iterations = mOptimized(c, steps);
    if (typeof result.iterations == "undefined") {
      result.iterations = iterations;
    }
    result.same = result.same && (iterations == result.iterations);

    color = colors[iterations];

    xi = x - x10;
    yi = y - y10;
    imd.data[(xi + yi * w) * 4 + 0] = color.r;
    imd.data[(xi + yi * w) * 4 + 1] = color.g;
    imd.data[(xi + yi * w) * 4 + 2] = color.b;
    imd.data[(xi + yi * w) * 4 + 3] = 255;
  }

  return result;
}

function computeAreaIter(x1, y1, x2, y2, steps, x10, y10, w, h, imd) {
  var color = { r: 0, g: 0, b: 0 };
  var iterations;
  var c;
  var x, y;
  var xi, yi;
  for (x = x1; x <= x2; x++) {
    for (y = y1; y <= y2; y++) {
      c = Complex.fromImage(x, y, c1, c2, width, height);

      iterations = mOptimized(c, steps);
      color = colors[iterations];

      xi = x - x10;
      yi = y - y10;
      imd.data[(xi + yi * w) * 4 + 0] = color.r;
      imd.data[(xi + yi * w) * 4 + 1] = color.g;
      imd.data[(xi + yi * w) * 4 + 2] = color.b;
      imd.data[(xi + yi * w) * 4 + 3] = 255;
    }
  }
}

function computeAreaStochastic(x1, y1, x2, y2, steps, x10, y10, w, h, imd) {
  const N = 100;
  
  var color = { r: 0, g: 0, b: 0 };
  var iterations;
  var c;
  var xi, yi;
  for (let i = 0; i < N; i++) {
    let x = Math.round(Math.random() * (w - 1));
    let y = Math.round(Math.random() * (h - 1));

    c = Complex.fromImage(x, y, c1, c2, width, height);

    iterations = mOptimized(c, steps);
    color = colors[iterations];

    xi = x - x10;
    yi = y - y10;
    imd.data[(xi + yi * w) * 4 + 0] = color.r;
    imd.data[(xi + yi * w) * 4 + 1] = color.g;
    imd.data[(xi + yi * w) * 4 + 2] = color.b;
    imd.data[(xi + yi * w) * 4 + 3] = 255;
  }
}

/*function m(c, steps) {
  var z = c;
  var i = 0;
  do {
    z = z.mul(z).add(c0 || c);
  } while (i++ < steps - 1 && z.abs() < 2);

  return i;
}*/

function mOptimized(c, steps) {
  var zre = c.re;
  var zim = c.im;
  var i = 0;
  c = c0 || c;
  var newZre, newZim;
  do {
    newZre = zre * zre - zim * zim + c.re;
    newZim = zim * zre + zim * zre + c.im;
    zre = newZre;
    zim = newZim;
  } while (i++ < steps - 1 && zre * zre + zim * zim < 4);

  return i;
}

Workerp.message(function (params) {
  if (params.palete) {
    colors = params.palete;
    return Promise.resolve(true);
  } else {
    width = params.width;
    height = params.height;

    c1 = params.c1;
    c2 = params.c2;
    c0 = params.c0;

    var steps = params.steps || 255;

    var startTime = (new Date()).getTime();
    var results = computeImage2(params.w, params.h, steps, params.stochastic);
    // var results = computeImage(0, 0, params.w - 1, params.h - 1, steps);
    var endTime = (new Date()).getTime();

    return Promise.resolve({ imd: results, renderTime: endTime - startTime });
  }
});