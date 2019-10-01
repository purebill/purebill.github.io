"use strict";

// see https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
var Clipboard = (function () {
  function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
    } catch (err) {
    }

    document.body.removeChild(textArea);
  }
  
  function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    navigator.clipboard.writeText(text).then(function() {
    }, function(err) {
    });
  }

  return {
    copy: copyTextToClipboard
  }
}) ();