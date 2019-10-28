function saveAsFile(canvas, name) {
  canvas.toBlob(blob => saveAs(blob, name + ".jpg"),
    "image/jpeg", 0.9);
}