'use strict';

class VoronoiNode {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
  }
}

class Color {
  constructor(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
}

/** @type {HTMLCanvasElement} */
let canvas = document.getElementById("c");
let ctx = canvas.getContext("2d");

const w = 512;
const h = 512;

canvas.width = w;
canvas.height = h;

const seeds = createVoronoiNodes(w, h, 10);

ctx.fillStyle = "black"
ctx.fillRect(0, 0, w, h);

function paint(t) {
  drawVoronoiDiagram(ctx, seeds);
}

function paintLoop(t) {
  paint();
  requestAnimationFrame(paintLoop);
}
// requestAnimationFrame(paintLoop);

requestAnimationFrame(paint);

let newIdx = -1;
canvas.onmousemove = e => {
  if (newIdx == -1) {
    newIdx = seeds.length;

    const hue = Math.random() * 360;
    const saturation = 100;
    const lightness = 30 + Math.round(Math.random() * 5) * 10;
    const color = hslToRgb(hue/360, saturation / 100, lightness / 100);

    seeds.push(new VoronoiNode(e.clientX, e.clientY, color));
  }
  seeds[newIdx].x = e.clientX;
  seeds[newIdx].y = e.clientY;

  requestAnimationFrame(paint);
};
canvas.onclick = e => {
  if (newIdx == -1) return;

  newIdx = -1;
  requestAnimationFrame(paint);
};
canvas.onmouseleave = e => {
  if (newIdx == -1) return;

  seeds.pop();
  newIdx = -1;

  requestAnimationFrame(paint);
};

function createVoronoiNodes(w, h, N) {
  let seeds = [];
  for (let i = 0; i < N; i++) {
    const x = Math.round(Math.random() * w);
    const y = Math.round(Math.random() * h);

    const hue = 360 / N * i;
    const saturation = 100;
    const lightness = 30 + Math.round(Math.random() * 5) * 10;
    const colorRgb = hslToRgb(hue/360, saturation / 100, lightness / 100);

    seeds.push(new VoronoiNode(x, y, colorRgb));
  }
  return seeds;
}

function drawVoronoiDiagram(ctx, nodes) {
  if (nodes.length == 0) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const imd = new ImageData(w, h);

  const randomnessFactor = 0;
  let imdIdx = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let i = 0; i < nodes.length; i++) {
        const sx = nodes[i].x;
        const sy = nodes[i].y;

        let randomness = randomnessFactor > 0 
          ? 1 - randomnessFactor + Math.random()*randomnessFactor
          : 1;
        const dist = (sx - x) * (sx - x) * randomness + (sy - y) * (sy - y) * randomness;

        // let randomness = randomnessFactor > 0 
        //   ? 1 + 2*(Math.random() - 0.5) * randomnessFactor
        //   : 1;
        // const dist = ((sx - x) * (sx - x) + (sy - y) * (sy - y)) * randomness;

        // const dist = Math.abs(sx - x)  + Math.abs(sy - y);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      imd.data[imdIdx + 0] = nodes[minIdx].color.r;
      imd.data[imdIdx + 1] = nodes[minIdx].color.g;
      imd.data[imdIdx + 2] = nodes[minIdx].color.b;
      imd.data[imdIdx + 3] = 255;
      imdIdx += 4;
    }
  }

  ctx.putImageData(imd, 0, 0);

  // show nodes

  // for (let i = 0; i < nodes.length; i++) {
  //   ctx.strokeStyle = "white";
  //   ctx.beginPath();
  //   ctx.arc(nodes[i].x, nodes[i].y, 3, 0, Math.PI * 2);
  //   ctx.stroke();
  // }
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Color}           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return new Color(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}
