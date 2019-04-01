let newBody = null;
let mouseMoveCallbackIdx = null;
const unitForcePerKg = 3e-3;

let forceX = null;
let forceY = null;

Keys.key("ArrowLeft", "Accelerate LEFT selected body", () => {
  if (state.ship == null) return;
  forceX = animateOnTimer([1], [10], 100, 3000,
    (k) => state.ship.applyForce(-unitForcePerKg * state.ship.m * k / state.scale, null));
}, () => {
  if (state.ship == null) return;
  forceX.cancel();
  state.ship.applyForce(0, null);
});

Keys.key("ArrowRight", "Accelerate RIGHT selected body", () => {
  if (state.ship == null) return;
  forceX = animateOnTimer([1], [10], 100, 3000,
    (k) => state.ship.applyForce(unitForcePerKg * state.ship.m * k / state.scale, null));
}, () => {
  if (state.ship == null) return;
  forceX.cancel();
  state.ship.applyForce(0, null)
});

Keys.key("ArrowUp", "Accelerate UP selected body", () => {
  if (state.ship == null) return;
  forceY = animateOnTimer([1], [10], 100, 3000,
    (k) => state.ship.applyForce(null, unitForcePerKg * state.ship.m * k / state.scale));
}, () => {
  if (state.ship == null) return;
  forceY.cancel();
  state.ship.applyForce(null, 0);
});

Keys.key("ArrowDown", "Accelerate DOWN selected body", () => {
  if (state.ship == null) return;
  forceY = animateOnTimer([1], [10], 100, 3000,
    (k) => state.ship.applyForce(null, -unitForcePerKg * state.ship.m * k / state.scale));
}, () => {
  if (state.ship == null) return;
  forceY.cancel();
  state.ship.applyForce(null, 0);
});

Keys.key("Delete", "Delete selected body", () => {
  if (state.ship !== null) {
    state.model = state.model.filter(b => b !== state.ship);
    state.ship = null;
  }
});

Keys.key("KeyG", "Turn ON/OFF gravity field", () => state.showField = !state.showField);
Keys.key("Space", "Pause ON/OFF", () => state.paused = !state.paused);

let dragging = false;
let dragX = 0, dragY = 0;
Keys.mouse(0, "Select a body or pan the Space", (e) => {
  let selected = state.model.filter(b => b.selected);
  if (selected.length > 0) {
    selectShip(selected[0]);
    return;
  }

  dragging = true;
  dragX = e.clientX;
  dragY = e.clientY;
}, () => {
  dragging = false;
});

Keys.mouse(2, "Create a new body", (e) => {
  let screenP = [e.clientX, e.clientY];
  let m = physics.earth.m * Math.pow(10, state.createEarthMass);
  newBody = Body.builder()
    .p(toWorldCoords(screenP))
    .m(m)
    .r(Math.pow(m / 2e4, 1/3))
    .v([0, 0])
    .color("#ff00ff")
    .build();

  newBody.screenP = newBody.client = screenP;
  newBody.static = true;
  calcFutureForIdx = state.model.push(newBody) - 1;

  mouseMoveCallbackIdx = renderPipeline.push((context) => {
      if (newBody == null) return;

      line(context.ctx, newBody.screenP[0], newBody.screenP[1], newBody.client[0], newBody.client[1], "#000000");
    }) - 1;
}, () => {
  if (newBody == null) return;

  newBody.static = state.createStatic;
  delete newBody.client;
  delete newBody.screenP;
  newBody = null;
  renderPipeline.splice(mouseMoveCallbackIdx, 1);
  calcFutureForIdx = null;
});

Keys.mouseMove("Pan the Space with the left button or select the speed of the new body with the right button", (e) => {
  if (dragging) {
    state.shiftX += e.clientX - dragX;
    state.shiftY += e.clientY - dragY;
    dragX = e.clientX;
    dragY = e.clientY;
    return;
  }

  let mouseP = [e.clientX, e.clientY];

  if (newBody == null) {
    state.model.forEach(b => {
      let screenP = toCanvasCoords(b.p);
      if (dist(screenP, mouseP) < 10) b.selected = true;
      else if (b.selected) b.selected = false;
    });

    return;
  }

  newBody.client = mouseP;

  newBody.v[0] = (newBody.screenP[0] - e.clientX) * physics.earth.orbit.velocity / 50;
  newBody.v[1] = (e.clientY - newBody.screenP[1]) * physics.earth.orbit.velocity / 50;
});

Keys.mouseZoom("Zoom IN/OUT", (e) => {
  var zoomIn = e.detail ? e.detail < 0 : e.deltaY < 0;
  state.scale = Math.max(0, state.scale * (zoomIn ? 1.1 : 1 / 1.1));
  StateUi.updateUi();
});

Keys.key("F1", "Show this help message (F1 again to hide)", () => {
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

Keys.key("Escape", "Recreate the Universe from defaults", () => {
  Object.keys(defaultState).forEach(k => state[k] = defaultState[k]);
  initModel();
  StateUi(state);
});

Keys.key("KeyA", "Turn ON/OFF position hold for the selected body", () => {
  if (state.ship === null) return;

  let ship = state.ship;

  ship.autopilot.on = !ship.autopilot.on;
  if (ship.autopilot) {
    ship.autopilot.p = ship.p.slice();
  } else {
    ship.applyForce(0, 0);
  }
});

Keys.key("KeyS", "Toggle static for the selected body", () => {
  if (state.ship == null) return;

  state.ship.static = !state.ship.static;
});

Keys.key("Enter", "", () => progressModel(state.model, state.modelStepSeconds));