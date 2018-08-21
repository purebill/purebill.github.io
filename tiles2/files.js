"use strict";

var Files = (function () {
  document.ondragover = function (ev) {
    ev.preventDefault();
    Message.show("Отпусти чтобы загрузить изображения");
  }

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
      if (Tiles.isEmpty() || !confirm("Добавить к существующим?")) {
        Tiles.newTiles(uris);
      } else {
        Tiles.addTiles(uris);
      }
      Message.hide();
      ev.dataTransfer.items.clear();
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
      converter.onload = function(e) {
        var dataUri = e.target.result;
        downscale(file, dataUri).then(resolve);
      };
      converter.readAsDataURL(file);
    });
  }

  const maxSize = 64;

  function downscale(file, dataUri) {
    return new Promise(function (resolve) {
      var img = new Image;
      img.onload = function() {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        var c = document.createElement("canvas");
        if (w >= h) {
          c.width = maxSize;
          c.height = Math.round(h/w * maxSize);
        } else {
          c.width = Math.round(w/h * maxSize);
          c.height = maxSize;
        }
        var ctx = c.getContext("2d");

        ctx.drawImage(this, 0, 0, c.width, c.height);
        resolve({
          name: file.name,
          width: c.width,
          height: c.height,
          uri: c.toDataURL("image/jpeg", 0.90),
          hash: sha256.hex(dataUri)
        });
      };
      img.src = dataUri;
    });
  }

  return {
    toDataUri: toDataUri
  }
}) ();