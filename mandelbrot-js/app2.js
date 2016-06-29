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
  var xm = 0, ym = 0;
  var stepsValues = [255, 500, 1000, 2000, 4000, 8000];
  var stepsValuesIdx = 1;
  var steps = stepsValues[0];
  var running = false;
  var averageTileCalcTime = 100;
  var drawCount = 0;
  
  init(true);

  function init(firstTime) {
    var c = document.getElementById("canvas");
    if (!firstTime) {
      prevWidth = c.width;
      prevHiehgt = c.height;
    }

    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    ctx = c.getContext("2d", {alpha: false});

    width = c.width;
    height = c.height;

    if (firstTime) {
      loadState();
      prevWidth = c.width;
      prevHiehgt = c.height;
    }

    var re1, re2, im1, im2;
    var f = width / height;
    if (c1 && c2) {
      var center = new Complex((c1.re + c2.re)/2, (c1.im + c2.im)/2);
      re1 = (c1.re - center.re) * width / prevWidth + center.re;
      im1 = (c1.im - center.im) * height / prevHiehgt + center.im;
      re2 = (c2.re - center.re) * width / prevWidth + center.re;
      im2 = (c2.im - center.im) * height / prevHiehgt + center.im;
    } else {
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
    }

    c1 = new Complex(re1, im1);
    c2 = new Complex(re2, im2);
    
    drawSet(c1, c2, ctx);
  }

  function drawSet(c1, c2, ctx) {
    saveState();
    stopCalculations();
    drawCount++;

    var parts = [];

    var tileSize = 128;
    for (var x = 0; x < width; x += tileSize) {
      for (var y = 0; y < height; y += tileSize) {
        var x2 = Math.min(x + tileSize - 1, width - 1);
        var y2 = Math.min(y + tileSize -1, height -1);
        parts.push([[x, y], [x2, y2]]);
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
    updateProgressIndicator();
    parts.forEach(function (part) {
      computePart(part[0][0], part[0][1], part[1][0], part[1][1]);
    });

    var partsFinished = 0;
    function computePart(x1, y1, x2, y2) {
      var startTime = new Date();

      worker().call({
        x1: x1, y1: y1, 
        x2: x2, y2: y2, 
        width: width, height: height, 
        c1: c1, c2: c2, c0: c0,
        steps: steps})
      .then(function (imd) {
        partsFinished++;
        running = partsFinished < parts.length;
        updateProgressIndicator();
        var width = x2 - x1 + 1;
        var height =  y2 - y1 + 1;

        ctx.putImageData(imd, x1, y1);
        averageTileCalcTime = (averageTileCalcTime + (new Date()).getTime() - startTime.getTime()) / 2;
        /*var bp = createImageBitmap(imd, 0, 0, width, height).then(function (image) {
          ctx.drawImage(image, x1, y1);
          averageTileCalcTime = (averageTileCalcTime + (new Date()).getTime() - startTime.getTime()) / 2;
        });*/
      });
    }
  }

  function renderFavicon(sourceContext) {
    var w = 64;
    var h = 64;

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(sourceContext, 0, 0, width, height, 0, 0, w, h);

    var link = document.getElementById('favicon');
    link.href = canvas.toDataURL("image/x-icon");
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  function saveState() {
    document.location.hash = btoa(JSON.stringify({
      center: {
        re: (c1.re + c2.re)/2,
        im: (c1.im + c2.im)/2
      },
      dist: c2.re - c1.re,
      stepsValuesIdx: stepsValuesIdx,
      c0: c0 && c0.serialize()
    }));
  }

  function loadState() {
    try {
      var state = JSON.parse(atob(document.location.hash.substr(1)));
      var center = state.center;
      var w = state.dist/2;
      var h = state.dist * height / width / 2;
      var re1 = center.re - w;
      var im1 = center.im - h;
      var re2 = center.re + w;
      var im2 = center.im + h;

      c1 = new Complex(re1, im1);
      c2 = new Complex(re2, im2);

      stepsValuesIdx = state.stepsValuesIdx;
      steps = stepsValues[stepsValuesIdx % stepsValues.length];

      if (state.c0) {
        c0 = Complex.fromSerialized(state.c0);
      }

      return true;
    } catch (e) {}

    return false;
  }

  function stopCalculations() {
    if (running) {
      workers.forEach(function (w) { w.reset(); });
      running = false;
      return;
    }
  }

  var moving = false;
  window.onmousedown = function(e) {
    moving = true;
    x1 = e.offsetX;
    y1 = e.offsetY;
  };

  var debouncedDrawSet = debounce(drawSet, 100);
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

  function debounce(func, swallowInterval) {
    var swallowTimeout;

    return function() {
      var context = this, args = arguments;

      var later = function() {
        clearTimeout(swallowTimeout);
        swallowTimeout = null;

        func.apply(context, args);
      };

      if (!swallowTimeout) {
        swallowTimeout = setTimeout(later, swallowInterval);
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
    } else {
      // zoom out
      c1New = new Complex((c1.re - xc) * 2 + xc, (c1.im - yc) * 2 + yc);
      c2New = new Complex((c2.re - xc) * 2 + xc, (c2.im - yc) * 2 + yc);
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

  function status() {
    document.getElementById("div").innerHTML = 
        "<b>" + (c0 ? "Julia Set" : "Mandelbrot Set") + "</b>"
        + "<br />Steps: " + steps
      + "<br />TileRender: " + Math.round(averageTileCalcTime) + "ms";
  }

  setInterval(status, 1000);

  function updateProgressIndicator() {
    document.getElementById("progress").style.display = running ? "block" : "none";
    if (!running) {
      renderFavicon(canvas);
    }
  }

  window.onresize = function (e) {
    init();
  }

  window.onkeypress = function (e) {
    console.debug(e);
    var ch = String.fromCharCode(e.charCode);
    if (e.keyCode == 27) {
      c0 = c1 = c2 = undefined;
      init();
    } else if (ch == "d" && !e.altKey && !e.ctrlKey) {
      stepsValuesIdx++
      steps = stepsValues[stepsValuesIdx % stepsValues.length];
      drawSet(c1, c2, ctx);
    }    
  }
})();