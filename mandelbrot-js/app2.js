(function () {
  var WORKERS = navigator.hardwareConcurrency || 4;
  var workers = [];
  for (var i = 0; i < WORKERS; i++) {
    workers.push(new Workerp("worker.js"));
  }

  var currentWorker = 0;
  function worker() {
    return workers[currentWorker++ % workers.length];
  }

  var ctx;
  var width;
  var height;
  var c1;
  var c2;
  var c0;
  var zoom = 1;
  var xm = 0, ym = 0;
  var stepsValues = [255, 10, 50, 500, 1000];
  var stepsValuesIdx = 1;
  var steps = stepsValues[0];
  var running = false;
  
  init();

  function init() {
    var c = document.getElementById("canvas");
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    ctx = c.getContext("2d");

    width = c.width;
    height = c.height;

    var re1, re2, im1, im2;
    var f = width / height;
    if (f >= 1) {
      im1 = -2;
      im2 = 2;
      re1 = im1 * f;
      re2 = im2 * f;
    } else {
      re1 = -2;
      re2 =  2;
      im1 = re1 / f;
      im2 = re2 / f;
    }

    c1 = new Complex(re1, im1);
    c2 = new Complex(re2, im2);
    c0;
    zoom = 1;
    
    drawSet(c1, c2, ctx);
  }

  function drawSet(c1, c2, ctx) {
    stopCalculations();

    status(c0 ? "Julia Set" : "Mandelbrot Set");

    var parts = [];
    var FACTOR = 10;
    var xParts = Math.floor(width / FACTOR);
    var yParts = Math.floor(height / FACTOR);
    for (var xPart = 0; xPart < FACTOR; xPart++) {
      for (var yPart = 0; yPart < FACTOR; yPart++) {
        var x1 = xPart * xParts;
        var y1 = yPart * yParts;
        var x2 = x1 + xParts - 1;
        var y2 = y1 + yParts - 1;
        parts.push([[x1, y1], [x2, y2]]);
      }
    }

    // reorder the parts by the distance from the current mouse pointer
    parts.sort(function (a, b) {
      var xa = (a[0][0] + a[1][0]) / 2;
      var ya = (a[0][1] + a[1][1]) / 2;
      var distA = (xm - xa)*(xm - xa) + (ym - ya)*(ym - ya);

      var xb = (b[0][0] + b[1][0]) / 2;
      var yb = (b[0][1] + b[1][1]) / 2;
      var distB = (xm - xb)*(xm - xb) + (ym - yb)*(ym - yb);

      return distA < distB ? -1 : distA == distB ? 0 : 1;
    });

    running = true;
    parts.forEach(function (part) {
      computePart(part[0][0], part[0][1], part[1][0], part[1][1]);
    });

    var partsFinished = 0;
    function computePart(x1, y1, x2, y2) {
      worker().call({
        x1: x1, y1: y1, 
        x2: x2, y2: y2, 
        width: width, height: height, 
        c1: c1, c2: c2, c0: c0,
        steps: steps})
      .then(function (imd) {
        partsFinished++;
        running = partsFinished < parts.length;
        var width = x2 - x1 + 1;
        var height =  y2 - y1 + 1;
        var bp = createImageBitmap(imd, 0, 0, width, height).then(function (image) {
          ctx.drawImage(image, x1, y1);
        });
      });
    }
  }

  function stopCalculations() {
    if (running) {
      workers.forEach(function (w) { w.reset(); });
      running = false;
    }
  }

  var moving = false;
  window.onmousedown = function(e) {
    moving = true;
    x1 = e.offsetX;
    y1 = e.offsetY;
  };

  var debouncedDrawSet = debounce(drawSet, 100, 100);
  window.onmousemove = function(e) {
    xm = e.offsetX;
    ym = e.offsetY;

    if (moving) {
      x2 = e.offsetX;
      y2 = e.offsetY;

      var before = Complex.fromImage(x1, y1, c1, c2, width, height);
      var now    = Complex.fromImage(x2, y2, c1, c2, width, height);

      c1.im -= now.im - before.im;
      c1.re -= now.re - before.re;

      c2.im -= now.im - before.im;
      c2.re -= now.re - before.re;

      x1 = x2;
      y1 = y2;

      debouncedDrawSet(c1, c2, ctx);
    }
  };

  function debounce(func, wait, forceRun) {
    var timeout;
    var forceRunTimeout;

    return function() {
      var context = this, args = arguments;

      var later = function() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        if (forceRunTimeout) {
          clearTimeout(forceRunTimeout);
          forceRunTimeout = null;
        }

        func.apply(context, args);
        console.debug("CALL");
      };

      clearTimeout(timeout);

      timeout = setTimeout(later, wait);
      if (!forceRunTimeout) {
        forceRunTimeout = setTimeout(later, forceRun);
      }
    };
  };

  var ignoreMouseUp = false;
  window.onmouseup = function(e) {
    moving = false;
  };

  var mousewheelevt = (/Firefox/i.test(navigator.userAgent))
    ? "DOMMouseScroll" 
    : "mousewheel";
   
  if (window.attachEvent)
      window.attachEvent("on" + mousewheelevt, onmousewheel);
  else if (window.addEventListener)
      window.addEventListener(mousewheelevt, onmousewheel, false)

  function onmousewheel(e) {
    var center = Complex.fromImage(e.offsetX, e.offsetY, c1, c2, width, height);
    var xc = center.re;
    var yc = center.im;

    var zoomIn = e.detail ? e.detail < 0 : e.deltaY < 0;
    if (zoomIn) {
      // zoom in
      c1New = new Complex((c1.re - xc) / 2 + xc, (c1.im - yc) / 2 + yc);
      c2New = new Complex((c2.re - xc) / 2 + xc, (c2.im - yc) / 2 + yc);
      zoom *= 2;
    } else {
      // zoom out
      c1New = new Complex((c1.re - xc) * 2 + xc, (c1.im - yc) * 2 + yc);
      c2New = new Complex((c2.re - xc) * 2 + xc, (c2.im - yc) * 2 + yc);
      zoom /= 2;
    }

    c1 = c1New;
    c2 = c2New;

    drawSet(c1, c2, ctx);

    return false;
  }

  window.ondblclick = function (e) {
    if (c0) {
      c0 = undefined;
    } else {
      c0 = Complex.fromImage(e.offsetX, e.offsetY, c1, c2, width, height);
    }

    drawSet(c1, c2, ctx);
  }

  function status(message) {
    document.getElementById("div").innerHTML = "Details: " + steps + "<br />"
      + "Zoom: " + zoom 
      + "<br />" + message;
  }

  window.onresize = function (e) {
    init();
  }

  window.onkeyup = function (e) {
    if (e.keyCode == 27) {
      c0 = undefined;
      init();
    } else if (e.key == "d") {
      steps = stepsValues[stepsValuesIdx++ % stepsValues.length];
      drawSet(c1, c2, ctx);
    }
  }
})();