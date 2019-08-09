var Keys = (function () {
  let keys = {};
  let pressed = {};
  let mouseActions = {};
  let mouseMoveAction = null;
  let mouseZoomAction = null;
  let canvas = null;

  window.onmousedown = e => {
    if (e.target != canvas) return;

    let mapping = mouseActions[e.button];
    if (mapping && mapping.down) {
      mapping.down(e);
      e.preventDefault();
    }
  };

  window.onmousemove = e => {
    if (e.target != canvas) return;

    if (mouseMoveAction) {
      mouseMoveAction.callback(e);
      e.preventDefault();
    }
  };

  window.onmouseup = e => {
    if (e.target != canvas) return;

    let mapping = mouseActions[e.button];
    if (mapping && mapping.up) {
      mapping.up(e);
      e.preventDefault();
    }
  };

  window.oncontextmenu = (e) => {
    e.preventDefault();
  };

  var mousewheelevt = (/Firefox/i.test(navigator.userAgent))
    ? "DOMMouseScroll"
    : "mousewheel";

  if (window.attachEvent)
    document.body.attachEvent("on" + mousewheelevt, onmousewheel);
  else if (window.addEventListener)
    document.body.addEventListener(mousewheelevt, onmousewheel, false);

  function onmousewheel(e) {
    if (mouseZoomAction) {
      mouseZoomAction.callback(e);
      e.preventDefault();
    }
  }

  window.onkeydown = (e) => {
    if (pressed[e.code]) return;
    pressed[e.code] = true;

    let mapping = keys[e.code];
    if (mapping && mapping.down) {
      mapping.down(e);
      e.preventDefault();
    }
    // console.debug(e.code);
  };

  window.onkeyup = (e) => {
    let mapping = keys[e.code];
    if (mapping && mapping.up) {
      mapping.up(e);
      e.preventDefault();
    }
    pressed[e.code] = false;
  };

  return {
    mouse: function (button, description, downCallback, upCallback) {
      mouseActions[button] = {
        description,
        down: downCallback,
        up: upCallback
      };
    },
    mouseMove: function (description, callback) {
      mouseMoveAction = {
        description,
        callback
      };
    },
    mouseZoom: function (description, callback) {
      mouseZoomAction = {
        description,
        callback
      }
    },
    key: function (code, description, downCallback, upCallback) {
      keys[code] = {
        description,
        down: downCallback,
        up: upCallback
      };
    },
    help: function () {
      let buttons = {
        0: "Left",
        1: "Middle",
        2: "Right"
      };

      return {
        keys: Object.keys(keys).map(k => k + ": " + keys[k].description),
        mouse: Object.keys(mouseActions).map(k => buttons[k] + " button: " + mouseActions[k].description)
          .concat(mouseMoveAction ? ["Mouse move: " + mouseMoveAction.description] : [])
          .concat(mouseZoomAction ? ["Mouse zoom: " + mouseZoomAction.description] : [])
      };
    },
    init: function (target) {
      canvas = target;
    }
  }
}) ();