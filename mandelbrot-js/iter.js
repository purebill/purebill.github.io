/* global Matrix:false */
/* global vector:false */

var c = document.getElementById("canvas");
c.width = window.innerWidth;
c.height = window.innerHeight;
var ctx = c.getContext("2d", { alpha: false });

var w = c.width;
var h = c.height;

/*
xi = ax * x + bx

0 = ax * -10 + bx
w = ax * 10 +  bx
bx = w/2
ax = w/2 / 10
*/
var bx = w / 2;
var ax = w / 2 / 1;

/*
yi = ay*y + by

0 = ay*10  + by
h = ay*-10 + by
by = h/2
ay = -h/2 / 10
*/
var by = h / 2;
var ay = -h / 2 / 1;

if (w > h) {
  ax /= w / h;
} else {
  ay /= w / h;
}


/*
Koch Curve
    ___
   |   |
   |   |
___|   |____
*/
var kochCurve = [
  Matrix.scale(1 / 3, 1 / 3).rotate(-90).shift(-1 / 6, 1 / 6),
  Matrix.scale(1 / 3, 1 / 3).shift(0, 1 / 3),
  Matrix.scale(1 / 3, 1 / 3).rotate(90).shift(1 / 6, 1 / 6)
];

/*
Serpinski Triangle

     /\ 
    /  \ 
   /____\
  /\    /\
 /  \  /  \
/    \/    \
+-----------+
*/
var serpinskiTriangle = [
  Matrix.scale(1 / 2, 1 / 2).shift(-1 / 2, -1 / 2),
  Matrix.scale(1 / 2, 1 / 2).shift(1 / 2, -1 / 2),
  Matrix.scale(1 / 2, 1 / 2).shift(0, 1 / 2)
];

/* Dragon curve */
var dragonCurve = [
  Matrix.scale(1 / Math.sqrt(2), 1 / Math.sqrt(2))
    .rotate(45)
    .shift(-1 / 2 * 1 / Math.sqrt(2), -1 / 2 * 1 / Math.sqrt(2)),
  Matrix.scale(1 / Math.sqrt(2), 1 / Math.sqrt(2))
    .rotate(90 + 45)
    .shift(1 / 2 * 1 / Math.sqrt(2), -1 / 2 * 1 / Math.sqrt(2))
];

/* Fern leaf */
var fern = [
  Matrix.scale(0.9, 0.9).rotate(3).shift(0, 0.1),
  Matrix.scale(0.3, 0.3).rotate(-90).shift(0, 0.1),
  Matrix.scale(-0.3, 0.3).rotate(90).shift(0, 0.1),
  Matrix.scale(0.01, 0.1) // trunk
];

/* Maple leaf */
var mapleLeaf = [
	Matrix.scale(0.5, 0.5).shift(0, 0.5),
	Matrix.scale(0.7, 0.9).rotate(45).shift(0.1, -0.1),
	Matrix.scale(0.7, 0.9).rotate(-45).shift(-0.1, -0.1),
	Matrix.scale(0.5, 0.5).rotate(90),
	Matrix.scale(0.5, 0.5).rotate(-90),
	Matrix.scale(0.01, 0.).rotate(180).shift(0, 0.2)
];


var matrixes = fern;

var sum = matrixes.map(function (m) { return Math.abs(m.det()); }).reduce(function (v, sum) { return sum + v; }, 0);
var probabilities = matrixes.map(function (m) { return Math.abs(m.det()) / sum; });

function nextMatrix() {
  for (;;) {
    var idx = Math.round(Math.random() * (probabilities.length - 1));
    if (Math.random() < probabilities[idx]) {
      return [matrixes[idx], idx];
    }
  }
}

updateProgressIndicator(true);

var cycles = 10000000;
var point = vector(0, 0);
//var colors = matrixes.map(function (_, idx) { return Color.fromHsv(idx / matrixes.length, 1, 1); });
var color = { r: 0, g: 0, b: 0 };
var xi, yi;
var matrix, idx;
var imd = new ImageData(w, h);

// fill with white
for (idx = 0; idx < w * h * 4; idx++) {
  imd.data[idx] = 255;
}

for (var i = 0; i < cycles; i++) {
  matrix = nextMatrix();
  point = matrix[0].applyToVector(point);

  // give it a time to get to the fractal
  if (i < 100) continue;

  xi = Math.round(ax * point[0] + bx);
  yi = Math.round(ay * point[1] + by);

	//color = colors[matrix[1]];
	color = {r: 255, g: 255, b: 255};

  imd.data[(xi + yi * w) * 4 + 0] = color.r;
  imd.data[(xi + yi * w) * 4 + 1] = color.g;
  imd.data[(xi + yi * w) * 4 + 2] = color.b;
  imd.data[(xi + yi * w) * 4 + 3] = 255;
}

ctx.putImageData(imd, 0, 0);
updateProgressIndicator(false);

function updateProgressIndicator(running) {
  document.getElementById("progress").style.display = running ? "block" : "none";
}