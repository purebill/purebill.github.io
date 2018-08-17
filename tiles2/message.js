"use strict";

var Message = (function () {
  var messageDiv = document.getElementById("message");

  function showMessage(message) {
    !message || (messageDiv.innerHTML = message);
    messageDiv.style.display = "block";
  }

  function hideMessage() {
    messageDiv.style.display = "none";
  }

  return {
    show: showMessage,
    hide: hideMessage
  }
}) ();