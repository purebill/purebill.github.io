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
  if (state.onChanged) state.onChanged();

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

    if (state.onChanged) state.onChanged();
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
  constructor(onClick) {
    this.items = [];
    this.onClick = onClick;
  }

  add(text, callback) {
    this.items.push({
      text,
      callback
    });
  }

  addSeparator() {
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
      button.innerText = item.text;
      button.onclick = () => {
        if (this.onClick) this.onClick();
        item.callback(cell);
      };

      const p = document.createElement("p");
      p.appendChild(button);

      el.appendChild(p);
    });

    el.style.display = "block";

    let x = cell.xc;
    let y = cell.yc;
    el.style.left = x + "px";
    el.style.top = y + "px";

    // wait 'till it renders and then correct the position so that it fits
    setTimeout(() => {
      if (x < 0) x = 0;
      if (x > window.innerWidth - 50 - el.clientWidth) x = window.innerWidth - 50 - el.clientWidth;
      if (y < 0) y = 0;
      if (y > window.innerHeight - 50 - el.clientHeight) y = window.innerHeight - 50 - el.clientHeight;

      el.style.left = x + "px";
      el.style.top = y + "px";
    }, 0);
  }

  hide() {
    this.items = [];
    const el = document.getElementById("contextMenu");
    el.innerHTML = "";
    el.style.display = "none";
  }
}