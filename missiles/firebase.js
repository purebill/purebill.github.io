var Firebase = (function () {
  var baseUrl = "https://missiles-e8ad3.firebaseio.com";
  var version = "v1";

  function put(path, jsonData) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("PUT", `${baseUrl}/${version}${path}.json`);

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
      xhr.open("GET", `${baseUrl}/${version}${path}.json`
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

  function load(path) {
    return get(path, false);
  }

  function loadKeys(path) {
    return get(path, true).then(function (keys) {
      if (keys != null) return Object.keys(keys);
      else return [];
    });
  }

  return {
    load,
    loadKeys
  };
})();

export default Firebase;