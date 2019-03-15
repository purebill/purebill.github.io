var State = (function () {
  var stateGetter, stateSetter;

  function getState() {
    return btoa(JSON.stringify(stateGetter()));
  }

  function saveState() {
    var newState = getState();

    if (document.location.hash != newState) {
      document.location.hash = newState;
    }
  }

  function loadState() {
    try {
      var state = JSON.parse(atob(document.location.hash.substr(1)));
      if (!state) return false;
      stateSetter(state);
      return true;
    } catch (e) {
      // just ignore if something went wrong while deserializing the state
    }
    return false;
  }

  window.onpopstate = loadState;

  return {
    init: function (getter, setter) {
      stateGetter = getter;
      stateSetter = setter;

      return loadState();
    },

    save: saveState,

    getState: getState,

    clear: function () {
      document.location.hash = "";
    }
  };
})();
