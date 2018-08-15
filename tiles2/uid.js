"use strict";

var Uid = (function () {
  var url = "https://api.random.org/json-rpc/1/invoke";
  var apiKey = "c39b179c-7559-4512-8db3-6cfccd63c748";
  var uidValue = localStorage["uid"];

  function uid() {
    return new Promise(function (resolve, reject) {
      if (uidValue) {
        resolve(uidValue);
        return;
      }

      var xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status.toString().startsWith("2")) {
            var value;
            try {
              value = JSON.parse(xhr.responseText).result.random.data[0];
            } catch (e) {
              value = generateLocally();
            }
            if (value) {
              set(value);
              resolve(uidValue);
            }
          } else {
            set(generateLocally());
            resolve(uidValue);
          }
        }
      };

      xhr.setRequestHeader("Content-Type", "application/json-rpc");
      xhr.setRequestHeader("Accept", "application/json");

      xhr.send(JSON.stringify({
        "jsonrpc": "2.0",
        "method": "generateUUIDs",
        "params": {
            "apiKey": apiKey,
            "n": 1
        },
        "id": 1
      }));
    });
  }

  function generateLocally() {
    var hash = sha256.create();

    // time
    hash.update((new Date()).getTime().toString());
    
    // some local entropy
    for (var i = 0; i < 10; i++) hash.update(Math.random().toString());

    // see https://github.com/Valve/fingerprintjs2/blob/master/fingerprint2.js
    hash.update(navigator.userAgent || '');
    hash.update(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || '');
    hash.update((window.screen.colorDepth || -1).toString());
    hash.update((navigator.deviceMemory || -1).toString());
    hash.update((window.devicePixelRatio || '').toString());
    hash.update((new Date().getTimezoneOffset()).toString());
    hash.update(navigator.cpuClass || '');
    hash.update(navigator.platform || '');
    hash.update((navigator.hardwareConcurrency || '').toString());
    
    return hash.hex();
  }

  function set(value) {
    uidValue = value;
    localStorage["uid"] = value;
  }

  return {
    uid: uid,
    set: set
  };
}) ();