function Matrix(a) {
  this.width = 3;
  this.height = 3;
  this.a = a || [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
}

/**
 * newM = m * m2
 */
Matrix.prototype.mul = function (m2) {
  if (this.width != m2.height) {
    throw new Error("Multiplication inconsistant matrixes");
  }

  var result = new Matrix();

  for (var i = 0; i < this.width; i++) {
    for (var j = 0; j < this.height; j++) {
      result.a[i][j] = 0;
      for (var k = 0; k < this.width; k++) {
        result.a[i][j] += this.a[i][k] * m2.a[k][j];
      }
    }
  }

  return result;
};

/**
 * newV = v * matrix;
 */
Matrix.prototype.applyToVector = function (v) {
  if (this.height != v.length) {
    throw new Error("Multiplication inconsistant vector");
  }

  var result = [0, 0, 0];
  for (var i = 0; i < v.length; i++) {
    for (var j = 0; j < this.height; j++) {
      result[i] += v[j] * this.a[j][i];
    }
  }

  return result;
};

Matrix.prototype.shift = function (dx, dy) {
  return this.mul(new Matrix([
    [1, 0, 0],
    [0, 1, 0],
    [dx, dy, 1]
  ]));
};

Matrix.shift = function (dx, dy) {
  return new Matrix().shift(dx, dy);
};

Matrix.prototype.scale = function (sx, sy) {
  return this.mul(new Matrix([
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ]));
};

Matrix.scale = function (sx, sy) {
  return new Matrix().scale(sx, sy);
};

Matrix.prototype.rotate = function (degrees) {
  var radians = degrees / 180 * Math.PI;
  var cos = Math.cos(radians);
  var sin = Math.sin(radians);
  return this.mul(new Matrix([
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1]
  ]));
};

Matrix.rotate = function (degrees) {
  return (new Matrix()).rotate(degrees);
};

Matrix.prototype.toString = function () {
  var s = "";
  for (var i = 0; i < this.width; i++) {
    s += this.a[i].join(", ");
    s += "\n";
  }

  return s;
};

Matrix.prototype.det = function () {
  return this.a[0][0] * this.a[1][1] * this.a[2][2]
    + this.a[0][1] * this.a[1][2] * this.a[2][0]
    + this.a[0][2] * this.a[1][0] * this.a[2][1]
    - this.a[0][2] * this.a[1][1] * this.a[2][0]
    - this.a[0][1] * this.a[1][0] * this.a[2][2]
    - this.a[0][0] * this.a[1][2] * this.a[2][1];
};

function vector(x, y) {
  return [x, y, 1];
}