/* global Workerp:false */
/* global Complex:false */
/* global Color:false */
/* global Random:false */
/* global Hammer:false */

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
  var initialC1, initialC2;
  var c1;
  var c2;
  var c0;
  var mouseX = 0, mouseY = 0;
  var stepsValues = [256, 1024, 2048, 2048*2, 2048*4, 2048*8, 2048*16, 2048*32];
  var stepsValuesIdx = 0;
  var steps = stepsValues[0];
  var running = false;
  var averageTileCalcTime = 0;
  var palete;
  var random = new Random();
  var ctrlPressed = false;
  var resetMouseCoords = false;
  var prevHiehgt, prevWidth;
  var zoomLevel = 0;
  var paleteIndex = 0;
  var paleteBuilders = [buildPalete, buildFractalPalete, buildBinaryPalete];

  init(true);

  function init(firstTime) {
    var c = document.getElementById("canvas");

    if (firstTime) Keys.init(c);

    if (!firstTime) {
      prevWidth = c.width;
      prevHiehgt = c.height;
    }

    c.width = window.innerWidth;
    c.height = window.innerHeight;
    ctx = c.getContext("2d", { alpha: false });

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
      var center = new Complex((c1.re + c2.re) / 2, (c1.im + c2.im) / 2);
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
        re2 = 2;
        im1 = re1 / f;
        im2 = re2 / f;
      }
    }

    c1 = new Complex(re1, im1);
    c2 = new Complex(re2, im2);

    initialC1 = c1.clone();
    initialC2 = c2.clone();

    palete = paleteBuilders[paleteIndex](steps);
    zoomLevel = 0;

    drawSet(c1, c2, ctx);
  }

  function drawSet(c1, c2, ctx) {
    saveState();
    stopCalculations();

    Promise.all(workers.map(function (worker) {
      return worker.call({
        palete: palete
      });
    })).then(function () {
      var parts = [];

      var tileSize = 128;
      for (var x = 0; x < width; x += tileSize) {
        for (var y = 0; y < height; y += tileSize) {
          var x2 = Math.min(x + tileSize - 1, width - 1);
          var y2 = Math.min(y + tileSize - 1, height - 1);
          parts.push([[x, y], [x2, y2]]);
        }
      }

      // reorder the parts by the distance from the current mouse pointer
      parts.sort(function (a, b) {
        var xa = (a[0][0] + a[1][0]) / 2;
        var ya = (a[0][1] + a[1][1]) / 2;
        var distA = (mouseX - xa) * (mouseX - xa) + (mouseY - ya) * (mouseY - ya);

        var xb = (b[0][0] + b[1][0]) / 2;
        var yb = (b[0][1] + b[1][1]) / 2;
        var distB = (mouseX - xb) * (mouseX - xb) + (mouseY - yb) * (mouseY - yb);

        return distA < distB ? -1 : (distA == distB ? 0 : 1);
      });

      var partsFinished = 0;
      averageTileCalcTime = 0;
      running = true;
      updateProgressIndicator();
      parts.forEach(function (part) {
        computePart(part[0][0], part[0][1], part[1][0], part[1][1]);
      });

      function computePart(x1, y1, x2, y2) {
        const c1Local = Complex.fromImage(x1, y2, c1, c2, width, height);
        const c2Local = Complex.fromImage(x2, y1, c1, c2, width, height);
        
        worker().call({
          w: x2 - x1 + 1, h: y2 - y1 + 1,
          width: x2 - x1 + 1, height: y2 - y1 + 1,
          c1: c1Local, c2: c2Local, c0,
          steps
        })
          .then(function (results) {
            var imd = results.imd;
            var renderTime = results.renderTime;

            partsFinished++;
            running = partsFinished < parts.length;
            if (!running) {
              //console.debug("Render time", ((new Date()).getTime() - renderStartTime.getTime()) / 1000);
            }
            updateProgressIndicator();

            ctx.putImageData(imd, x1, y1);
            averageTileCalcTime = (averageTileCalcTime + renderTime) / 2;
          });
      }
    });
  }

  function carrier(t, f) {
    return Math.sin(f * 2*Math.PI * t - Math.PI/2) + 1;
  }

  function buildPalete(steps) {
    var colors = [];
    const gap = 0;
    const f = Math.log2(steps)/8;
    for (var step = 0; step <= steps; step++) {
      const h = carrier(step/steps, f*4);
      const s = (step > gap && step < steps - gap) ? 1 - carrier(step/steps, f) : 0;
      const v = (step > gap && step < steps - gap) ? 1 : 0;
      if (step <= 1) {
        colors[step] = Color.fromHsv(0, 0, 0);
      }
      else if (step >= steps - 1) {
        colors[step] = Color.fromHsv(0.7, 0, 1 - step/steps);
      } else {
        colors[step] = Color.fromHsv(h, s, v);
      }
    }
    return colors;
  }

  function buildBinaryPalete(steps) {
    var colors = [];
    const gap = 0;
    for (var step = 0; step <= steps; step++) {
      if (step == steps) {
        colors[step] = Color.fromHsv(0, 0, 0);
      } else {
        colors[step] = Color.fromHsv(0, 0, 1);
      }
    }
    return colors;
  }

  function buildFractalPalete(steps) {
    var colors = [];

    colors[0] = new Color(255, 255, 255);
    colors[steps] = new Color(0, 0, 0);

    var buildFractalPaleteR = function (i1, i2, level) {
      if (i2 - i1 < 2) return;

      var rand = rand = (2 * random.nextFloat(0, 1) - 1) * 255 / level;
      var r = Math.round((colors[i1].r + colors[i2].r) / 2 + rand);

      rand = (2 * random.nextFloat(0, 1) - 1) * 255 / level;
      var g = Math.round((colors[i1].g + colors[i2].g) / 2 + rand);

      rand = rand = (2 * random.nextFloat(0, 1) - 1) * 255 / level;
      var b = Math.round((colors[i1].b + colors[i2].b) / 2 + rand);

      var imid = Math.round((i1 + i2) / 2);
      colors[imid] = new Color(r, g, b);

      buildFractalPaleteR(i1, imid, level * 1.7);
      buildFractalPaleteR(imid, i2, level * 1.7);
    };

    buildFractalPaleteR(0, steps, 1);
    return colors;
  }

  function renderFavicon(sourceContext) {
    var w = 64;
    var h = 64;

    var canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(sourceContext, 0, 0, width, height, 0, 0, w, h);

    var link = document.getElementById("favicon");
    link.href = canvas.toDataURL("image/x-icon");
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  function saveState() {
    var newState = btoa(JSON.stringify({
      center: {
        re: (c1.re + c2.re) / 2,
        im: (c1.im + c2.im) / 2
      },
      dist: c2.re - c1.re,
      stepsValuesIdx: stepsValuesIdx,
      c0: c0 && c0.serialize(),
      seed: random.seed,
      zoomLevel,
      paleteIndex
    }));

    document.getElementById("permalink").href = "#" + newState;
  }

  function loadState() {
    if (!document.location.hash.substr(1)) return;

    try {
      var state = JSON.parse(atob(document.location.hash.substr(1)));
      var center = state.center;
      var w = state.dist / 2;
      var h = state.dist * height / width / 2;
      var re1 = center.re - w;
      var im1 = center.im - h;
      var re2 = center.re + w;
      var im2 = center.im + h;
      var seed = state.seed;
      if (seed) {
        random = new Random(seed);
      }

      c1 = new Complex(re1, im1);
      c2 = new Complex(re2, im2);

      stepsValuesIdx = state.stepsValuesIdx;
      steps = stepsValues[stepsValuesIdx % stepsValues.length];

      if (state.c0) {
        c0 = Complex.fromSerialized(state.c0);
      }

      if (state.paleteIndex !== undefined) paleteIndex = state.paleteIndex;
      if (state.zoomLevel !== undefined) zoomLevel = state.zoomLevel;

      document.location.hash = "";
      return true;
    } catch (e) {
      // just ignore if something went wrong while deserializing the state
    }

    return false;
  }

  function stopCalculations() {
    if (running) {
      workers.forEach(function (w) { w.reset(); });
      running = false;
    }
  }

  var moving = false;
  var juliaMoving = false;
  var x1, y1;
  Keys.mouse(0, ["Shift"],
    "Click and drag for Julia set animation",
    e => {
      moving = false;
      juliaMoving = false;
    },
    e => {
      if (moving || juliaMoving) return;
      x1 = e.offsetX;
      y1 = e.offsetY;
      juliaMoving = true;
      moving = false;
    }
  );
  Keys.mouse(0, [],
    "Click and drag to pan",
    e => {
      moving = false;
      juliaMoving = false;
    },
    e => {
      if (moving || juliaMoving) return;
      x1 = e.offsetX;
      y1 = e.offsetY;
      juliaMoving = false;
      moving = true;
    }
  );
  Keys.mouse(2, [], "Log address", null, e => {
    const c = Complex.fromImage(e.clientX, e.clientY, c1, c2, width, height);
    const x = (c.re - initialC1.re) / (initialC2.re - initialC1.re);
    const y = (c.im - initialC1.im) / (initialC2.im - initialC1.im);
    const address = Tile.fromCoords(x, y, zoomLevel);
    console.log(address);
  });

  var debouncedDrawSet = debounce(drawSet, 100, 500);
  Keys.mouseMove([], "Click and drag to pan", e => {
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    var x2 = e.offsetX;
    var y2 = e.offsetY;

    if (resetMouseCoords) {
      x1 = x2;
      y1 = y2;
      resetMouseCoords = false;
      return;
    }

    if (moving) {
      var before = Complex.fromImage(x1, y1, c1, c2, width, height);
      var now = Complex.fromImage(x2, y2, c1, c2, width, height);

      c1.im -= now.im - before.im;
      c1.re -= now.re - before.re;

      c2.im -= now.im - before.im;
      c2.re -= now.re - before.re;

      x1 = x2;
      y1 = y2;

      debouncedDrawSet(c1, c2, ctx);
    }
  });
  Keys.mouseMove(["Shift"], "Click and drag for Julia set animation", e => {
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    var x2 = e.offsetX;
    var y2 = e.offsetY;

    if (resetMouseCoords) {
      x1 = x2;
      y1 = y2;
      resetMouseCoords = false;
      return;
    }

    if (juliaMoving) {
      var xm, ym;
      var dx = x2 - x1;
      var dy = y2 - y1;

      if (!ctrlPressed) {
        xm = x1 + dx / 4;
        ym = y1 + dy / 4;
      } else {
        xm = x2;
        ym = y2;
      }

      c0 = Complex.fromImage(xm, ym, c1, c2, width, height);
      debouncedDrawSet(c1, c2, ctx);
    }
  });

  function debounce(func, swallowInterval, timeoutInterval) {
    var swallowId = null;
    var timeoutId = null;

    return function () {
      var context = this, args = arguments;

      var later = function () {
        if (swallowId) clearTimeout(swallowId);
        swallowId = null;
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;

        func.apply(context, args);
      };

      if (swallowId) clearTimeout(swallowId);
      swallowId = setTimeout(later, swallowInterval);

      if (timeoutId === null) timeoutId = setTimeout(later, timeoutInterval);
    };
  }

  Keys.mouseZoom([], "Scroll to zoom", e => {
    var center = Complex.fromImage(e.offsetX, e.offsetY, c1, c2, width, height);
    var xc = center.re;
    var yc = center.im;

    var zoomIn = e.deltaY < 0;

    if (zoomLevel == 0 && !zoomIn) return;
    if (zoomLevel == 50 && zoomIn) return;

    if (zoomIn) {
      // zoom in
      var c1New = new Complex((c1.re - xc) / 2 + xc, (c1.im - yc) / 2 + yc);
      var c2New = new Complex((c2.re - xc) / 2 + xc, (c2.im - yc) / 2 + yc);
      zoomLevel++;
    } else {
      // zoom out
      c1New = new Complex((c1.re - xc) * 2 + xc, (c1.im - yc) * 2 + yc);
      c2New = new Complex((c2.re - xc) * 2 + xc, (c2.im - yc) * 2 + yc);
      zoomLevel--;
    }

    c1 = c1New;
    c2 = c2New;

    debouncedDrawSet(c1, c2, ctx);

    return false;
  });

  Keys.doubleclick([], "Change the set to Mandelbrot / Julia", e => {
    if (c0) {
      c0 = undefined;
    } else {
      c0 = Complex.fromImage(e.offsetX, e.offsetY, c1, c2, width, height);
    }

    drawSet(c1, c2, ctx);
  });

  function status() {
    const x = ((c1.re + c2.re) / 2 - initialC1.re) / (initialC2.re - initialC1.re);
    const y = ((c1.im + c2.im) / 2 - initialC1.im) / (initialC2.im - initialC1.im);
    const address = Tile.fromCoords(x, y, zoomLevel);

    document.getElementById("div").innerHTML =
      "<b>" + (c0 ? "Julia Set" : "Mandelbrot Set") + "</b>"
      + "<br />Zoom: " + zoomLevel
      + "<br />Steps: " + steps
      + "<br />TileRender: " + Math.round(averageTileCalcTime) + "ms"
      + "<br />Address: " + address;
  }

  setInterval(status, 1000);

  function updateProgressIndicator() {
    document.getElementById("progress").style.display = running ? "block" : "none";
    if (!running) {
      renderFavicon(document.getElementById("canvas"));
    }
  }

  window.onresize = e => init();

  Keys.key("Escape", [], "Escape to reset", null, e => {
    c0 = c1 = c2 = undefined;
    steps = stepsValues[0];
    init();
  });
  Keys.key("Space", [], "TBD",
    e => {
      ctrlPressed = true;
      resetMouseCoords = true;
    },
    e => {
      ctrlPressed = false;
      resetMouseCoords = true;
    }
  );
  Keys.key("KeyD", [], "Iterate details", e => {
    stepsValuesIdx++;
    steps = stepsValues[stepsValuesIdx % stepsValues.length];
    palete = paleteBuilders[paleteIndex](steps);
    drawSet(c1, c2, ctx);
  });
  Keys.key("KeyP", [], "Cycle through paletes", e => {
    random.reset();
    paleteIndex = (paleteIndex + 1) % paleteBuilders.length;
    palete = paleteBuilders[paleteIndex](steps);
    drawSet(c1, c2, ctx);
  });
  Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
    let el = document.getElementById("help");

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

  // var hammertime = new Hammer(document.body, {});
  // hammertime.get("pinch").set({ enable: true });
  // hammertime.get("rotate").set({ enable: true });

  // hammertime.on("pinchend", function (e) {
  //   onmousewheel({
  //     offsetX: e.center.x,
  //     offsetY: e.center.y,
  //     detail: e.scale > 1 ? -1 : 1
  //   });
  // });

  // hammertime.on("panstart", function (e) {
  //   window.onmousedown({
  //     offsetX: e.center.x,
  //     offsetY: e.center.y
  //   });
  // });

  // hammertime.on("panmove", function (e) {
  //   window.onmousemove({
  //     offsetX: e.center.x,
  //     offsetY: e.center.y
  //   });
  // });

  // hammertime.on("panend", function (e) {
  //   window.onmouseup({
  //     offsetX: e.center.x,
  //     offsetY: e.center.y
  //   });
  // });
})();