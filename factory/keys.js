var Keys = (function () {
  let keys = {};
  let pressed = {};
  let mouseActions = {};
  let mouseMoveAction = null;
  let mouseZoomAction = null;
  let canvas = null;

  function actionKey(e) {
    return e.button.toString()
    + ","
    + e.altKey.toString()
    + ","
    + e.ctrlKey.toString()
    + ","
    + e.metaKey.toString()
    + ","
    + e.shiftKey.toString();
  }

  const buttonToName = {
    0: "Left",
    1: "Middle",
    2: "Right"
  };

  function actionKeyToKeys(actionKey) {
    let parsed = actionKey.split(",");
    return (parsed[1] == "true" ? "Alt + " : "")
      + (parsed[2] == "true" ? "Ctrl + " : "")
      + (parsed[3] == "true" ? "Win + " : "")
      + (parsed[4] == "true" ? "Shift + " : "")
      + buttonToName[parsed[0]];
  }

  window.onmousedown = e => {
    if (e.target != canvas) return;

    let mapping = mouseActions[actionKey(e)];
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

    let mapping = mouseActions[actionKey(e)];
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
    mouse: function (/**@type {number} */button, /**@type String[] */keys, description, downCallback, upCallback) {
      const key = actionKey({
        button,
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      });
      mouseActions[key] = {
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
      return {
        keys: Object.keys(keys).map(k => k + ": " + keys[k].description),
        mouse: Object.keys(mouseActions).map(k => actionKeyToKeys(k) + " button: " + mouseActions[k].description)
          .concat(mouseMoveAction ? ["Mouse move: " + mouseMoveAction.description] : [])
          .concat(mouseZoomAction ? ["Mouse zoom: " + mouseZoomAction.description] : [])
      };
    },
    init: function (target) {
      canvas = target;
    }
  }
}) ();