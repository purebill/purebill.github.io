"use strict";

var Firebase = (function () {
  function save(key, jsonData, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("PUT", "https://tilesman-5afef.firebaseio.com/v1/users/ilya/" + key + ".json");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status.toString().startsWith("2")) {
          !callback || callback(JSON.parse(xhr.responseText));
        } else {
          !callback || callback(null);
        }
      }
    };

    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");

    xhr.send(jsonData);
  }

  function load(key, callback, shallow) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://tilesman-5afef.firebaseio.com/v1/users/ilya" + (key ? "/" + key : "") + ".json"
        + (shallow ? "?shallow=true" : ""));

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status.toString().startsWith("2")) {
          callback(JSON.parse(xhr.responseText));
        } else {
          callback(null);
        }
      }
    };

    xhr.setRequestHeader("Accept", "application/json");

    xhr.send();
  }

  function loadKeys(callback) {
    load(null, function (keys) {
      if (keys != null) callback(Object.keys(keys));
      else callback([]);
    }, true);
  }

  return {
    save: save,
    load: load,
    loadKeys: loadKeys
  };
})();