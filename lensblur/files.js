"use strict";

var Files = (function () {
  var callbacks = [];

  document.ondragover = function (ev) {
    ev.preventDefault();
    Message.show("Отпусти чтобы загрузить изображения");
  };

  // see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop#Process_the_drop
  document.ondrop = function (ev) {
    ev.preventDefault();

    if (!filesDroped(ev.dataTransfer.items)) {
      Message.hide();
      return;
    }

    Message.show("Обрабатывается...");

    var dataUris = [];
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      var file = ev.dataTransfer.items[i].getAsFile();
      if (file.type == "image/jpeg" || file.type == "image/png") {
        dataUris.push(toDataUri(file));
      }
    }

    if (dataUris.length == 0) {
      Message.hide();
      return;
    }

    Promise.all(dataUris).then(function (uris) {
      ev.dataTransfer.items.clear();

      Message.hide();
      callbacks.forEach(it => it.call(null, uris));
    });
  };

  function filesDroped(items) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind !== 'file') {
        return false;
      }
    }
    return true;
  }

  function toDataUri(file) {
    // see https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl
    return new Promise(function (resolve) {
      var converter = new FileReader();
      converter.onload = function (e) {
        var dataUri = e.target.result;
        fillSize(file, dataUri).then(resolve);
      };
      converter.readAsDataURL(file);
    });
  }

  function fillSize(file, dataUri) {
    return new Promise(function (resolve) {
      var img = new Image;
      img.onload = function () {
        resolve({
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          uri: dataUri
        });
      };
      img.src = dataUri;
    });
  }

  function registerCallback(callback) {
    callbacks.push(callback);
  }

  return {
    registerCallback
  }
})();