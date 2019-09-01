var Keys = (function () {
  class KeysFrame {
    constructor() {
      this.keyUp = {};
      this.keyDown = {};
      this.mouseUp = {};
      this.mouseDown = {};
      this.mouseMoveAction = null;
      this.mouseZoomAction = null;
      this._next = null;
    }
  }

  let root = new KeysFrame();

  function find(name, value) {
    let node = root;
    do {
      if (node[name][value]) return node[name][value];
      node = node._next;
    } while (node !== null);
    return null;
  }

  let pressed = {};
  let mouseMoveAction = null;
  let mouseZoomAction = null;
  let canvas = null;

  function actionKey(e, sourceName) {
    return e[sourceName].toString()
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

    let mapping = find("mouseDown", actionKey(e, "button"));
    if (mapping) {
      mapping.callback(e);
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

    let mapping = find("mouseUp", actionKey(e, "button"));
    if (mapping) {
      mapping.callback(e);
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

    let mapping = find("keyDown", actionKey(e, "code"));
    if (mapping) {
      e.preventDefault();
      mapping.callback(e);
    }
  };

  window.onkeyup = (e) => {
    pressed[e.code] = false;

    let mapping = find("keyUp", actionKey(e, "code"));
    if (mapping) {
      e.preventDefault();
      mapping.callback(e);
    }
  };

  return {
    mouse: function (/**@type {number} */button, /**@type String[] */keys, description, downCallback, upCallback) {
      const key = actionKey({
        button,
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      }, "button");

      if (downCallback) {
        root.mouseDown[key] = {
          description,
          callback: downCallback
        };
      }
      if (upCallback) {
        root.mouseUp[key] = {
          description,
          callback: upCallback
        }
      }
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
    key: function (code, /**@type String[] */keys, description, downCallback, upCallback) {
      const action = actionKey({
        code: code.toString(),
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      }, "code");

      if (downCallback) {
        root.keyDown[action] = {
          description,
          callback: downCallback
        }
      }
      if (upCallback) {
        root.keyUp[action] = {
          description,
          callback: upCallback
        }
      }
    },
    help: function () {
      let keys = new Set();
      // TODO
      return {
        keys: Object.keys(keys).map(k => k + ": " + keys[k].description),
        mouse: Object.keys(mouseActions).map(k => actionKeyToKeys(k) + " button: " + mouseActions[k].description)
          .concat(mouseMoveAction ? ["Mouse move: " + mouseMoveAction.description] : [])
          .concat(mouseZoomAction ? ["Mouse zoom: " + mouseZoomAction.description] : [])
      };
    },
    init: function (target) {
      canvas = target;
    },
    push: () => {
      let node = new KeysFrame();
      node._next = root;
      root = node;
    },
    pop: () => {
      if (root._next !== null) root = root._next;
    },
    resetToRoot: () => {
      while (root._next !== null) {
        root = root._next;
      }
    }
  }
}) ();
