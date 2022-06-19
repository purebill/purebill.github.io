'use strict';

import { splitWH } from "./tiles.js";
import { distanceChebyshev, distanceEuclidean, distanceFlatTorus, distanceManhatten, distanceMinkovski3, renderVoronoiDiagram } from "./voronoi.js";
import { Workerp } from "./workerp.js";

const WORKERS = navigator.hardwareConcurrency || 2;
/**@type {Workerp[]} */
const workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}
let currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

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

// const w = 512;
// const h = 512;
const w = window.innerWidth - 1;
const h = window.innerHeight - 5;

canvas.width = w;
canvas.height = h;

const seeds = createVoronoiNodes(w, h, 10);

// ctx.fillStyle = "black"
// ctx.fillRect(0, 0, w, h);

/**@type {((sx: number, sy: number, x: number, y: number) => number)[]} */
let distFuns = [distanceEuclidean, distanceManhatten, distanceChebyshev, distanceMinkovski3, distanceFlatTorus];
let distIdx = 0;
let randomnessFactor = 0;
let showNodes =  false;
let working = false;

const shadowCanvas = document.createElement("canvas");
shadowCanvas.width = w;
shadowCanvas.height = h;
const shadowCtx = shadowCanvas.getContext("2d");

function repaint(force) {
  if (working) {
    if (!force) return;

    workers.forEach(w => w.reset());
  }

  working = true;
  drawVoronoiDiagram(shadowCtx, seeds, distFuns[distIdx])
  .then(() => requestAnimationFrame(t => ctx.drawImage(shadowCanvas, 0, 0)))
  .then(() => working = false);
}

repaint();

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

  repaint();
};

canvas.onclick = e => {
  if (newIdx == -1) return;

  newIdx = -1;
  repaint();
};
canvas.onmouseleave = e => {
  if (newIdx == -1) return;

  seeds.pop();
  newIdx = -1;

  repaint(true);
};

window.onkeydown = e => {
  if (e.code == "KeyD") {
    distIdx = (distIdx + 1) % distFuns.length;
    repaint();
    message("Distance: " + distFuns[distIdx].name.replace("distance", ""));
    return;
  }

  if (e.code == "KeyR") {
    randomnessFactor = 0.3 - randomnessFactor;
    repaint();
    message(randomnessFactor == 0 ? "Normal" : "Fuzzy");
    return;
  }
  
  if (e.code == "KeyN") {
    showNodes = !showNodes;
    message(showNodes ? "Show nodes" : "Hide nodes");
    repaint();
    return;
  }

  if (e.code == "Escape") {
    newIdx = -1;
    seeds.splice(0, seeds.length);
    repaint();
    message("Cleared");
  }
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

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {VoronoiNode[]} nodes 
 * @param {(sx: number, sy: number, x: number, y: number) => number} distFun 
 * @returns 
 */
async function drawVoronoiDiagram(ctx, nodes, distFun) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  if (nodes.length == 0) {
    ctx.fillRect(0, 0, w, h);
    return;
  }

  await Promise.all(workers.map(w => w.call({seeds})));

  await Promise.all(
    splitWH(w, h, Math.ceil(Math.max(w, h) / workers.length))
    .map(tile => 
      worker()
      .call({tile, distFun: distFun.name, randomnessFactor, width: w, height: h})
      .then(imd => ctx.putImageData(imd, tile.left, tile.top))));

  // show nodes

  if (showNodes) {
    ctx.fillStyle = "white";
    for (let i = 0; i < nodes.length; i++) {
      ctx.beginPath();
      ctx.arc(nodes[i].x, nodes[i].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
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

let messageDiv = null;
let messageCount = 0;

function message(m, delay) {
  delay = delay || 2000;

  if (messageDiv == null) {
    messageDiv = document.createElement("div");
    messageDiv.style.position = "absolute";
    messageDiv.style.left = "0";
    messageDiv.style.width = w + "px";
    messageDiv.style.top = (canvas.clientTop + h/2) + "px";
    messageDiv.style.height = h/2 + "px";
    messageDiv.style.pointerEvents = "none";
    document.body.appendChild(messageDiv);

    messageDiv.onclick = e => false;
  }

  const mDiv = document.createElement("div");
  mDiv.innerText = m;
  mDiv.style.display = "table";
  mDiv.style.marginLeft = "auto";
  mDiv.style.marginRight = "auto";
  mDiv.style.background = "white";
  mDiv.style.padding = "5px";
  mDiv.style.marginBottom = "5px";
  mDiv.style.pointerEvents = "none";
  messageDiv.appendChild(mDiv);
  messageCount++;

  window.setTimeout(() => {
    messageDiv.removeChild(mDiv);
    if (--messageCount == 0) {
      document.body.removeChild(messageDiv);
      messageDiv = null;
    }
  }, delay);
}