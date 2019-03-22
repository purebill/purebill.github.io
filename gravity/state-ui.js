function StateUi(state) {
  StateUi.state = state;
  StateUi.updateUi();

  let defaultState = {};
  for (let key in state) defaultState[key] = state[key];

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
