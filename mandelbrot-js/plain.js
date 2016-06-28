(function () {
  function Plain(canvas) {
    this.ctx = canvas.getContext("2d");
    this.id = this.ctx.createImageData(1, 1);
    this.d  = this.id.data;
  }

  Plain.prototype.pixel = function (x, y, color, a) {
    this.d[0] = color.r;
    this.d[1] = color.g;
    this.d[2] = color.b;
    this.d[3] = a;

    this.ctx.putImageData(this.id, x, y); 
  };

  window.Plain = Plain;
})();