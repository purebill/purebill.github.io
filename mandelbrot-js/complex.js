function Complex(re, im) {
  this.re = re;
  this.im = im;
}

Complex.prototype.add = function(c2) {
  return new Complex(this.re + c2.re, this.im + c2.im);
};

Complex.prototype.mul = function(c2) {
  // (re1 + i*im1)(re2 + i*im2) = re1*re2 - im1*im2 + i*(im1*re2 + im2*re1)
  var re = this.re * c2.re - this.im * c2.im;
  var im = this.im * c2.re + c2.im * this.re;
  return new Complex(re, im);
};

Complex.prototype.div = function(c2) {
  // (re1 + i*im1) / (re2 + i*im2) = (re1 + i*im1) * (re2 - i*im2) / (re2^2 + im2^2) =
  // = ( re1*re2 + im1*im2 + i * (im1*re2 - im2*re1) ) / (re2^2 + im2^2)
  var d = c2.re * c2.re + c2.im * c2.im;
  var re = (this.re * c2.re + this.im * c2.im) / d;
  var im = (this.im * c2.re - this.re * c2.im) / d;
  return new Complex(re, im);
};

Complex.prototype.abs = function() {
  return this.re * this.re + this.im * this.im;
};

Complex.prototype.toString = function() {
  return "(re: " + this.re + ", im: " + this.im + ")";
};

Complex.prototype.serialize = function() {
  return {re: this.re, im: this.im};
};

Complex.fromImage = function (x, y, c1, c2, width, height) {
  var re1 = c1.re, re2 = c2.re;
  var im1 = c1.im, im2 = c2.im;

  var bx = re1;
  var ax = (re2 - bx) / (width - 1);
  var by = im2;
  var ay = (im1 - by) / (height - 1);

  return new Complex(ax * x + bx, ay * y + by);
};

Complex.fromSerialized = function (serialized) {
  return new Complex(serialized.re, serialized.im);
};