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
              reject(xhr);
            }
            if (value) {
              set(value);
              resolve(uidValue);
            }
          } else {
            reject(xhr);
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

  function set(value) {
    uidValue = value;
    localStorage["uid"] = value;
  }

  return {
    uid: uid,
    set: set
  };
}) ();