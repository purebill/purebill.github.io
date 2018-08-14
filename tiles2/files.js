"use strict";

var Files = (function () {
  $("main").ondragover = function (ev) {
    Message.show("Отпусти чтобы загрузить изображения");
  };

  document.ondragover = function (ev) {
    ev.preventDefault();
  }

  // see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop#Process_the_drop
  document.ondrop = function (ev) {
    ev.preventDefault();

    Message.show("Обрабатывается...");

    var dataUris = [];
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        if (file.type == "image/jpeg" || file.type == "image/png") {
          dataUris.push(toDataUri(file));
        }
      }
    }
    Promise.all(dataUris).then(function (uris) {
      ev.dataTransfer.items.clear();
      Tiles.newTiles(uris);
      Message.hide();
      ev.dataTransfer.items.clear();
    });
  };

  var c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  var ctx = c.getContext("2d");

  function toDataUri(file) {
    // see https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl
    return new Promise(function (resolve) {
      var converter = new FileReader();
      converter.onload = function(e) {
        var dataUri = e.target.result;
        downscale(file, dataUri).then(resolve);
        // resolve({
        //   name: file.name,
        //   uri: dataUri,
        //   hash: sha256.hex(dataUri)
        // });
      };
      converter.readAsDataURL(file);
    });
  }

  function downscale(file, dataUri) {
    return new Promise(function (resolve, reject) {
      var img = new Image;
      img.onload = function() {
        ctx.drawImage(this, 0, 0, c.width, c.height);
        resolve({
          name: file.name,
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