"use strict";

const Uid = (function () {
  function uid() {
      return generateLocally();
  }

  function generateLocally() {
    var hash = sha256.create();

    // time
    hash.update((new Date()).getTime().toString());
    
    // some local entropy
    if (window.crypto) {
      var array = new Uint32Array(16);
      window.crypto.getRandomValues(array);
      for (let v of array) hash.update(v.toString());
    } else {
      for (var i = 0; i < 16; i++) hash.update(Math.random().toString());
    }

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

  return {
    get: uid
  };
}) ();