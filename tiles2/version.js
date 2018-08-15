"use strict";

var Version = (function () {
  var checkIntervalMs = 15 * 60 * 1000;

  var subscribers = [];
  var currentVersion;

  function getVersion() {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "version.json");

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status.toString().startsWith("2")) {
            resolve(JSON.parse(xhr.responseText).version);
          } else {
            reject(xhr);
          }
        }
      };

      xhr.setRequestHeader("Accept", "application/json");

      xhr.send();
    });
  }

  return {
    get: function () {
      return new Promise(function (resolve) {
        if (currentVersion === undefined) {
          getVersion().then(function (version) {
            currentVersion = version;
        
            setInterval(function () {
              getVersion().then(function (version) {
                if (version != currentVersion) {
                  if (currentVersion !== undefined) {
                    subscribers.forEach(function (it) { it(version, currentVersion); });
                  }
                  currentVersion = version;
                }
              });
            }, checkIntervalMs);

            resolve(currentVersion);
          });
        } else {
          resolve(currentVersion);
        }
      });
    },

    subscribe: function (listener) { subscribers.push(listener); }
  };
}) ();