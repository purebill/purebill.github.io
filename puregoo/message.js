"use strict";

var Message = (function () {
  var messageDiv = document.getElementById("message");

  function showMessage(message, timeout) {
    !message || (messageDiv.innerHTML = message);
    messageDiv.style.display = "block";
    if (timeout) window.setTimeout(() => hideMessage(), timeout);
  }

  function hideMessage() {
    messageDiv.style.display = "none";
  }

  return {
    show: showMessage,
    hide: hideMessage
  }
}) ();

export default Message;