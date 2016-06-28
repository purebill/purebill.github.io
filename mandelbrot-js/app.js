(function () {
  var c = document.getElementById("canvas");
  var ctx = c.getContext("2d");
  c.width  = 1000;
  c.height = 700;
  c.style.width  = c.width + "px";
  c.style.height = c.height + "px";

  var width = c.width;
  var height = c.height;

  var p = new Plain(c);

  var c1 = new Complex(-2, -1);
  var c2 = new Complex(1, 1);
  drawSet(c1, c2);

  function imToC(x, y, c1, c2, width, height) {
    var re1 = c1.re, re2 = c2.re;
    var im1 = c1.im, im2 = c2.im;

    var bx = re1;
    var ax = (re2 - bx) / (width - 1);
    var by = im2;
    var ay = (im1 - by) / (height - 1);

    return new Complex(ax * x + bx, ay * y + by);
  }

  function drawSet(c1, c2) {
    var imd = new ImageData(width, height);

    for (var x = 0; x < width; x++) {
      for (var y = 0; y < height; y++) {
        var c = imToC(x, y, c1, c2, width, height);
        var d = 255 - m(c, 255);
        var color = Color.fromHsv(d/255, 1, d/255);

        imd.data[(x + y * width) * 4 + 0] = color.r;
        imd.data[(x + y * width) * 4 + 1] = color.g;
        imd.data[(x + y * width) * 4 + 2] = color.b;
        imd.data[(x + y * width) * 4 + 3] = 255;

        //p.pixel(x, y, color, 255);
      }
    }

    var bp = createImageBitmap(imd, 0, 0, width,height).then(function (image) {
      ctx.drawImage(image, 0, 0);
    });

  }
  
  function m(c, steps) {
    var z = c;
    var i = 1;
    do {
      z = z.mul(z).add(c);
    } while (i++ < steps && z.abs() < 2);

    return i;
  }


  var div = document.getElementById('div'), x1 = 0, y1 = 0, x2 = 0, y2 = 0;
  function reCalc() {
    var x3 = Math.min(x1,x2);
    var x4 = Math.max(x1,x2);
    var y3 = Math.min(y1,y2);
    var y4 = Math.max(y1,y2);
    div.style.left = x3 + 'px';
    div.style.top = y3 + 'px';
    div.style.width = x4 - x3 + 'px';
    div.style.height = y4 - y3 + 'px';
  }
  window.onmousedown = function(e) {
    div.hidden = 0;
    x1 = e.clientX;
    y1 = e.clientY;
    reCalc();
  };
  window.onmousemove = function(e) {
    x2 = e.clientX;
    y2 = e.clientY;

    var d = Math.max(x2 - x1, y2 - y1);
    x2 = x1 + d * width / height;
    y2 = y1 + d;
    reCalc();
  };
  window.onmouseup = function(e) {
    div.hidden = 1; //Hide the div

    x1 -= canvas.offsetLeft;
    x2 -= canvas.offsetLeft;
    y1 -= canvas.offsetTop;
    y2 -= canvas.offsetTop;

    if (x1 < 0 || x2 < 0 || x1 >= width || x2 >= width
      || y1 < 0 || y2 < 0 || y1 >= height || y2 >= height) 
    {
      console.debug("MISS");
      return;
    }

    var c1New = imToC(x1, y2, c1, c2, width, height);
    var c2New = imToC(x2, y1, c1, c2, width, height);
    drawSet(c1New, c2New);
    c1 = c1New;
    c2 = c2New;
  };
})();