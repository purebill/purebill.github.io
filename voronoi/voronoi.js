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

/**@type {((sx: number, sy: number, x: number, y: number) => number)[]} */
let distFuns = [distanceFlatTorus, distanceEuclideanSq, distanceManhatten, distanceChebyshev, distanceMinkovski3];
let distIdx = 0;
let randomnessFactor = 0;
let mouseX = 0, mouseY = 0;
let showNodes =  false;

function paint(t) {
  drawVoronoiDiagram(ctx, seeds, distFuns[distIdx]);
  // distanceFlatTorus(w/2, h/2, mouseX, mouseY);
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

  mouseX = e.clientX;
  mouseY = e.clientY;

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

window.onkeydown = e => {
  if (e.code == "KeyD") {
    distIdx = (distIdx + 1) % distFuns.length;
    requestAnimationFrame(paint);
    message("Distance: " + distFuns[distIdx].name.replace("distance", ""));
    return;
  }

  if (e.code == "KeyR") {
    randomnessFactor = 0.3 - randomnessFactor;
    requestAnimationFrame(paint);
    message(randomnessFactor == 0 ? "Normal" : "Fuzzy");
    return;
  }
  
  if (e.code == "KeyN") {
    showNodes = !showNodes;
    message(showNodes ? "Show nodes" : "Hide nodes");
    requestAnimationFrame(paint);
    return;
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

function distanceEuclideanSq(sx, sy, x, y) {
  return (sx - x) * (sx - x) + (sy - y) * (sy - y);
}


function distanceManhatten(sx, sy, x, y) {
  return Math.abs(sx - x)  + Math.abs(sy - y);
}

function distanceMinkovski3(sx, sy, x, y) {
  const dx = Math.abs(sx-x);
  const dy = Math.abs(sy-y);
  return dx*dx*dx + dy*dy*dy;
}

function distanceChebyshev(sx, sy, x, y) {
  return Math.max(Math.abs(sx -x), Math.abs(sy -y));
}

function distanceFlatTorus(sx, sy, x, y) {
  let d,l;

  const dx = x - sx;
  const dy = y - sy;

  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    // same point
    d = 0;
    l = 0;
  }
  else if (Math.abs(dx) < 1e-6) {
    // vertical line
    d = Math.abs(dy);
    l = h;
  }
  else if (Math.abs(dy) < 1e-6) {
    // horizontal line
    d = Math.abs(dx);
    l = w;
  }
  else {
    // x(t) = sx + t*(x - sx)
    // y(t) = sy + t*(y - sy)
    //
    // (a)------(b)
    //  |        |
    //  |        |
    // (c)------(d)

    // TODO: handle corners

    let foundPoints = 0;
    let rx1, ry1, rx2, ry2;

    let t_ab = (0 - sy) / dy;
    let x_ab = sx + t_ab * dx;
    if (x_ab >= 0 && x_ab <= w) {
      rx1 = x_ab;
      ry1 = 0;
      foundPoints++;
    }

    let t_cd = (h - sy) / dy;
    let x_cd = sx + t_cd * dx;
    if (x_cd >= 0 && x_cd <= w) {
      if (foundPoints > 0) {
        rx2 = x_cd;
        ry2 = h;
      } else {
        rx1 = x_cd;
        ry1 = h;
      }
      foundPoints++;
    }

    if (foundPoints < 2) {
      let t_ac = (0 - sx) / dx;
      let y_ac = sy + t_ac * dy;
      if (y_ac >= 0 && y_ac <= h) {
        if (foundPoints == 0 || Math.abs(rx1) >= 1e-6 || Math.abs(ry1 - y_ac) >= 1e-6) {
          if (foundPoints > 0) {
            rx2 = 0;
            ry2 = y_ac;
          } else {
            rx1 = 0;
            ry1 = y_ac;
          }
          foundPoints++;
        }
      }
    }

    if (foundPoints < 2) {
      let t_bd = (w - sx) / dx;
      let y_bd = sy + t_bd * dy;
      if (y_bd >= 0 && y_bd <= h) {
        if (foundPoints == 0 || Math.abs(rx1 - w) >= 1e-6 || Math.abs(ry1 - y_bd) >= 1e-6) {
          if (foundPoints > 0) {
            rx2 = w;
            ry2 = y_bd;
          } else {
            rx1 = w;
            ry1 = y_bd;
          }
          foundPoints++;
        }
      }
    }

    // ctx.clearRect(0, 0, w, h);
    // ctx.beginPath();
    // ctx.rect(0, 0, w, h);
    // ctx.moveTo(rx1, ry1);
    // ctx.lineTo(rx2, ry2);
    // ctx.stroke();
    // console.log(rx1, ry1, rx2, ry2);

    d = Math.sqrt(dx*dx + dy*dy);
    l = Math.sqrt((rx2 - rx1)*(rx2 - rx1) + (ry2 - ry1)*(ry2 - ry1));
    
    if (l < d) debugger;
  }

  return Math.min(d, l - d);
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {VoronoiNode[]} nodes 
 * @param {(sx: number, sy: number, x: number, y: number) => number} distFun 
 * @returns 
 */
function drawVoronoiDiagram(ctx, nodes, distFun) {
  if (nodes.length == 0) return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  const imd = new ImageData(w, h);

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
        const dist = distFun(sx, sy, x, y) * randomness;

        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }

      // const fadeFactor = 1 - Math.log10((minDist > 10000 ? 10000 : minDist))/4;
      const fadeFactor = 1;
      imd.data[imdIdx + 0] = nodes[minIdx].color.r*fadeFactor;
      imd.data[imdIdx + 1] = nodes[minIdx].color.g*fadeFactor;
      imd.data[imdIdx + 2] = nodes[minIdx].color.b*fadeFactor;
      imd.data[imdIdx + 3] = 255;
      imdIdx += 4;
    }
  }

  ctx.putImageData(imd, 0, 0);

  // show nodes

  if (showNodes) {
    for (let i = 0; i < nodes.length; i++) {
      ctx.strokeStyle = "white";
      ctx.beginPath();
      ctx.arc(nodes[i].x, nodes[i].y, 3, 0, Math.PI * 2);
      ctx.stroke();
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
  delay = delay || 1000;

  if (messageDiv == null) {
    messageDiv = document.createElement("div");
    messageDiv.style.position = "absolute";
    messageDiv.style.left = "0";
    messageDiv.style.width = w + "px";
    messageDiv.style.top = (canvas.clientTop + h/2) + "px";
    messageDiv.style.height = h/2 + "px";
    document.body.appendChild(messageDiv);

    messageDiv.onclick = e => false;
  }

  const mDiv = document.createElement("div");
  mDiv.innerText = m;
  mDiv.style.marginLeft = "auto";
  mDiv.style.marginRight = "auto";
  mDiv.style.background = "white";
  mDiv.style.padding = "5px";
  mDiv.style.marginBottom = "5px";
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