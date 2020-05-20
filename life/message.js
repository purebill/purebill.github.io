"use strict";

var Message = (function () {
  var messageDiv = null;

  function showMessage(message) {
    ensureDiv();

    !message || (messageDiv.innerHTML = message);
    messageDiv.style.display = "block";
  }

  function hideMessage() {
    ensureDiv();

    messageDiv.style.display = "none";
  }

  function ensureDiv() {
    if (messageDiv == null) {
      messageDiv = document.createElement("div");
      messageDiv.style.display = "none";
      messageDiv.style.position = "absolute";
      messageDiv.style.backgroundColor = "white";
      messageDiv.style.left = "50%";
      messageDiv.style.top = "50%";
      document.body.appendChild(messageDiv);
    }
  }

  return {
    show: showMessage,
    hide: hideMessage
  }
}) ();