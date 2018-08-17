"use strict";

var Message = (function () {
  var messageDiv = document.createElement("div");
  messageDiv.style.position = "absolute";
  messageDiv.style.left = "0";
  messageDiv.style.top = "0";
  messageDiv.style.width = "100%";
  messageDiv.style.height = "100%";
  messageDiv.style.fontSize = "20pt";
  messageDiv.style.display = "none";
  messageDiv.style.backgroundColor = "white";
  messageDiv.style.textAlign = "center";
  messageDiv.style.verticalAlign = "middle";
  messageDiv.style.lineHeight = "300px";
  document.body.appendChild(messageDiv);

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