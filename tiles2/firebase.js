"use strict";

var Firebase = (function () {
  var baseUrl = "https://tilesman-5afef.firebaseio.com/";
  var version = "v1";

  function save(user, key, jsonData) {
    return put("/users/" + user + "/" + key, jsonData);
  }

  function put(path, jsonData) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", baseUrl + version + path + ".json");

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

  function get(path, shallow) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", baseUrl + version + path + ".json"
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

  function load(user, key, shallow) {
    return get("/users/" + user + (key ? "/" + key : ""), shallow);
  }

  function loadKeys(user) {
    return load(user, null, true).then(function (keys) {
      if (keys != null) return Object.keys(keys);
      else return [];
    });
  }

  function loadVersion(key) {
    return Uid.uid().then(function (uid) {
      return get("/versions/" + uid + "/" + key).then(function (version) {
        return version || 0;
      }).catch(function () {
        return 0;
      });
    });
  }

  function saveVersion(key, version) {
    return Uid.uid().then(function (uid) {
      return put("/versions/" + uid + "/" + key, version);
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
    },
    loadVersion: loadVersion,
    saveVersion: saveVersion
  };
})();