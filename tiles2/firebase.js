"use strict";

var Firebase = (function () {
  var baseUrl = "https://tilesman-5afef.firebaseio.com/";
  // var baseUrl = "https://test-5cac4.firebaseio.com/";
  var version = "v2";

  function save(user, key, jsonData) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", baseUrl + version + "/users/" + user + "/" + key + ".json");

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status.toString().startsWith("2")) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(xhr);
          }
        }
      };

      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");

      xhr.send(jsonData);
    });
  }

  function load(user, key, shallow) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", baseUrl + version + "/users/" + user + (key ? "/" + key : "") + ".json"
          + (shallow ? "?shallow=true" : ""));

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status.toString().startsWith("2")) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(xhr);
          }
        }
      };

      xhr.setRequestHeader("Accept", "application/json");

      xhr.send();
    });
  }

  function loadKeys(user) {
    return new Promise(function (resolve, reject) {
      load(user, null, true).then(function (keys) {
        if (keys != null) resolve(Object.keys(keys));
        else resolve([]);
      });
    });
  }

  return {
    save: function (key, jsonData) {
      return Uid.uid().then(function (uid) { return save(uid, key, jsonData); })
    },
    load: function (key, shallow) {
      return Uid.uid().then(function (uid) { return load(uid, key, shallow); })
    },
    loadKeys: function () {
      return Uid.uid().then(function (uid) { return loadKeys(uid); })
    }
  };
})();