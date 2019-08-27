function StateUi(state) {
  StateUi.state = state;
  StateUi.updateUi();

  let defaultState = {};
  for (let key in state) defaultState[key] = state[key];

  document.querySelectorAll("button").forEach(it => it.onclick = () => {
    state[it.dataset.action]();
  });
  document.querySelectorAll("input[type=range]").forEach(it => it.oninput = updateState);
  document.querySelectorAll("input[type=color]").forEach(it => it.onchange = updateState);
  document.querySelectorAll("input[type=checkbox]").forEach(it => it.onchange = updateState);
  document.querySelectorAll("input").forEach(it => {
    it.ondblclick = (e) => {
      it.value = defaultState[it.id];
      updateState();

      e.preventDefault();
    };
  });

  function updateState() {
    document.querySelectorAll("input[type=range]").forEach(it => {
      let type = it.dataset.type;
      switch (type) {
        case "float":
          state[it.id] = parseFloat(it.value);
          break;
        default:
          state[it.id] = parseInt(it.value);
          break;
      }
    });

    document.querySelectorAll("input[type=color]").forEach(it => {
      state[it.id] = it.value;
    });

    document.querySelectorAll("input[type=checkbox]").forEach(it => {
      state[it.id] = it.checked;
    });
  }
}

StateUi.state = {};

StateUi.updateUi = function() {
  document.querySelectorAll("input[type=range]").forEach(it => {
    document.getElementById(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=color]").forEach(it => {
    document.getElementById(it.id).value  = state[it.id];
  });
  document.querySelectorAll("input[type=checkbox]").forEach(it => {
    document.getElementById(it.id).checked  = state[it.id];
  });
};


class ContextMenu {
  constructor() {
    this.items = [];
  }

  add(text, callback) {
    this.items.push({
      text,
      callback
    });
  }

  addSepartor() {
    this.items.push({
      separator: true
    })
  }

  showForCell(cell) {
    if (this.items.length === 0) return;
    
    const el = document.getElementById("contextMenu");

    this.items.forEach(item => {
      if (item.separator) {
        el.appendChild(document.createElement("hr"));
        return;
      }

      const button = document.createElement("button");
      button.innerHTML = item.text;
      button.onclick = () => item.callback(cell);

      const p = document.createElement("p");
      p.appendChild(button);

      el.appendChild(p);
    });

    el.onclick = () => this.hide();

    el.style.left = cell.xc + "px";
    el.style.top = cell.yc + "px";
    el.style.display = "block";
  }

  hide() {
    this.items = [];
    const el = document.getElementById("contextMenu");
    el.innerHTML = "";
    el.style.display = "none";
  }
}