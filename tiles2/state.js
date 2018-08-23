var State = (function () {
  let callbacks = [];

  $(() => onPopState);

  window.addEventListener("popstate", onPopState);

  function onPopState() {
    if (history.state === null) {
      // restore state from the URL
      let hash = decodeURIComponent(window.location.hash.substr(1));
      history.replaceState({hash}, hash, "#" + encodeURIComponent(hash));
    }

    callbacks.forEach(callback => callback(history.state.hash));
  }

  function replace(hash) {
    history.replaceState({hash}, hash, "#" + encodeURIComponent(hash));
  }

  function add(hash) {
    history.pushState({hash}, hash, "#" + encodeURIComponent(hash));
  }

  function init(callback) {
    callbacks.push(callback);
  }

  function get() {
    return history.state ? history.state.hash : null;
  }

  return {
    init,
    replace,
    add,
    get
  };
}) ();