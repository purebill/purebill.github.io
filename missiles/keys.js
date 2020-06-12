var Keys = (function () {
  class KeysFrame {
    constructor() {
      this.keyUp = {};
      this.keyDown = {};
      this.mouseUp = {};
      this.mouseDown = {};
      this.mouseLeave = {};
      this.mouseMoveAction = {};
      this.mouseZoomAction = {};
      this.doubleclickAction = {};
      this._next = null;
    }

    clone() {
      const c = new KeysFrame();
      c.keyUp = Object.assign({}, this.keyUp);
      c.keyDown = Object.assign({}, this.keyDown);
      c.mouseUp = Object.assign({}, this.mouseUp);
      c.mouseDown = Object.assign({}, this.mouseDown);
      c.mouseLeave = Object.assign({}, this.mouseLeave);
      c.mouseMoveAction = Object.assign({}, this.mouseMoveAction);
      c.mouseZoomAction = Object.assign({}, this.mouseZoomAction);
      c.doubleclickAction = Object.assign({}, this.doubleclickAction);
      if (this._next != null) c._next = this._next.clone();
      return c;
    }
  }

  let pressed = {};
  let canvas = null;
  let root = new KeysFrame();

  function find(getField, value) {
    let node = root;
    do {
      let field = getField(node);
      if (field[value]) return field[value];
      node = node._next;
    } while (node !== null);
    return null;
  }

  function* iterateKeys(getField) {
    let visited = new Set();
    for (let node = root; node != null; node = node._next) {
      let field = getField(node);

      for (let actionKey of Object.keys(field)) {
        if (visited.has(actionKey)) continue;
        visited.add(actionKey);

        yield [actionKey, field[actionKey]];
      }
    }
  }

  function actionKey(e, sourceName) {
    return (e[sourceName] === undefined ? "" : e[sourceName]).toString()
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
    0: t`Left`,
    1: t`Middle`,
    2: t`Right`
  };

  function actionKeyToKeys(actionKey) {
    let parsed = actionKey.split(",");
    return (parsed[1] == "true" ? "Alt + " : "")
      + (parsed[2] == "true" ? "Ctrl + " : "")
      + (parsed[3] == "true" ? "Win + " : "")
      + (parsed[4] == "true" ? "Shift + " : "")
      + (buttonToName[parsed[0]] ? buttonToName[parsed[0]] : t(parsed[0]).replace(/^Key/, ""));
  }

  function init(target) {
    canvas = target;

    canvas.onmousedown = e => {
      e.preventDefault();
  
      let mapping = find(node => node.mouseDown, actionKey(e, "button"));
      if (mapping) mapping.callback(e);
    };
  
    canvas.onmousemove = e => {
      e.preventDefault();
  
      let mapping = find(node => node.mouseMoveAction, actionKey(e, ""));
      if (mapping) mapping.callback(e);
    };
  
    canvas.onmouseup = e => {
      e.preventDefault();
  
      let mapping = find(node => node.mouseUp, actionKey(e, "button"));
      if (mapping) mapping.callback(e);
    };

    canvas.ondblclick = e => {
      e.preventDefault();

      let mapping = find(node => node.doubleclickAction, actionKey(e, ""));
      
      if (mapping) mapping.callback(e);
    };
  
    // just prevent showing the browser's context menu
    window.oncontextmenu = (e) => e.preventDefault();
  
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
  
      let mapping = find(node => node.mouseZoomAction, actionKey(e, ""));
      if (mapping) mapping.callback(e);
    }, false);
  
    canvas.addEventListener("mouseleave", (e) => {
      e.preventDefault();
      
      let callback = find(node => node.mouseLeave, "callback");
      if (callback) callback(e);
    });
  }

  window.onkeydown = (e) => {
    if (pressed[e.code]) return;
    pressed[e.code] = true;

    let mapping = find(node => node.keyDown, actionKey(e, "code"));
    if (mapping) {
      e.preventDefault();
      mapping.callback(e);
    }
  };

  window.onkeyup = (e) => {
    pressed[e.code] = false;

    let mapping = find(node => node.keyUp, actionKey(e, "code"));
    if (mapping) {
      e.preventDefault();
      mapping.callback(e);
    }
  };

  return {
    doubleclick: function(/**@type String[] */ keys,
                          description,
                          callback) {
      const key = actionKey({
        button: "Left",
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      }, "");

      root.doubleclickAction[key] = {
        description,
        callback: callback
      };
    },
    mouse: function (/**@type {number} */ button,
                     /**@type String[] */ keys,
                     description,
                     upCallback,
                     downCallback)
    {
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
    mouseMove: function (keys, description, callback) {
      const key = actionKey({
        button: "",
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      }, "button");

      root.mouseMoveAction[key] = {
        description,
        callback
      };
    },
    mouseLeave: function (description, callback) {
      root.mouseLeave = {
        description,
        callback
      };
    },
    mouseZoom: function (/**@type String[] */keys, description, callback) {
      const key = actionKey({
        button: "",
        altKey: keys.indexOf("Alt") !== -1,
        ctrlKey: keys.indexOf("Ctrl") !== -1,
        metaKey: keys.indexOf("Win") !== -1 || keys.indexOf("Meta") !== -1,
        shiftKey: keys.indexOf("Shift") !== -1
      }, "button");

      root.mouseZoomAction[key] = {
        description,
        callback
      };
    },
    key: function (code, 
                   /**@type String[] */keys,
                   description,
                   downCallback,
                   upCallback) {
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
      const f = (getField) => {
        let keys = [];
        for (let [actionKey, value] of iterateKeys(getField)) {
          keys.push({
            description: value.description,
            button: actionKey
          });
        }
        return keys;
      };

      return {
        keys: f(node => node.keyDown).map(({button, description}) => actionKeyToKeys(button) + ": " + description),
        mouse: f(node => node.mouseUp).map(({button, description}) => actionKeyToKeys(button) + ": " + description)
          .concat(f(node => node.mouseZoomAction).map(({button, description}) => actionKeyToKeys(button) + "Wheel" + ": " + description))
      };
    },
    init,
    push: () => {
      let node = new KeysFrame();
      node._next = root;
      root = node;
    },
    pop: () => {
      if (root._next !== null) root = root._next;
    },
    snapshot: () => {
      return root.clone();
    },
    restoreFromSnapshot: snapshot => {
      root = snapshot;
    },
    resetToRoot: () => {
      while (root._next !== null) {
        root = root._next;
      }
    }
  }
}) ();
