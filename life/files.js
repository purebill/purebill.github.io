"use strict";

var Files = (function () {
  document.ondragover = function (ev) {
    ev.preventDefault();
    Message.show("Drop to load");
  }

  let onFileCallback = null;

  // see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop#Process_the_drop
  document.ondrop = function (ev) {
    ev.preventDefault();

    if (!filesDroped(ev.dataTransfer.items)) {
      Message.hide();
      return;
    }

    Message.show("Processing...");

    var promises = [];
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      var file = ev.dataTransfer.items[i].getAsFile();
      // console.log("FILE", file);
      promises.push(toText(file).then(text => [file.name, text]));
    }
    
    if (promises.length == 0) {
      Message.hide();
      return;
    }

    Promise.all(promises).then(function (files) {
      ev.dataTransfer.items.clear();

      Message.hide();
      onFileCallback && files.forEach(it => onFileCallback(it[0], it[1]));
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

  function toText(file) {
    // see https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl
    return new Promise(function (resolve) {
      var converter = new FileReader();
      converter.onload = e => resolve(e.target.result);
      converter.readAsText(file);
    });
  }

  return {
    onFileDropped: callback => onFileCallback = callback
  };
}) ();