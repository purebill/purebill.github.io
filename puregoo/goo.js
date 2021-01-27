import { linear4, linearColor } from "./linear.js";

export function gooImg(img, imgBuffer, tile) {
  const result = new ImageData(tile.width, tile.height);

  for (let row = tile.top; row < tile.top + tile.height; row++) {
    for (let col = tile.left; col < tile.left + tile.width; col++) {
      let idx = row*img.width*2 + col*2;
      let x1 = Math.round(imgBuffer[idx++]);
      let y1 = Math.round(imgBuffer[idx]);

      if (x1 < 0 || x1 >= img.width || y1 < 0 || y1 >= img.height) continue;

      const imgIndex = (x1 + y1 * img.width) * 4;
      
      const rrow = row - tile.top;
      const rcol = col - tile.left;
      const rIndex = (rcol + rrow * tile.width) * 4;

      result.data[rIndex]     = img.data[imgIndex];
      result.data[rIndex + 1] = img.data[imgIndex + 1];
      result.data[rIndex + 2] = img.data[imgIndex + 2];
      result.data[rIndex + 3] = img.data[imgIndex + 3];
    }
  }

  return result;
}

export function gooImgLinear(img, imgBuffer, tile) {
  const result = new ImageData(tile.width, tile.height);

  for (let row = tile.top; row < tile.top + tile.height; row++) {
    for (let col = tile.left; col < tile.left + tile.width; col++) {
      let idx = row*img.width*2 + col*2;
      let x1 = imgBuffer[idx++];
      let y1 = imgBuffer[idx];

      if (x1 < 0 || x1 >= img.width || y1 < 0 || y1 > img.height) continue;

      const x11 = Math.floor(x1);
      const x12 = Math.ceil(x1);
      const y11 = Math.floor(y1);
      const y12 = Math.ceil(y1);

      const i1 = (x11 + y11 * img.width) * 4;
      const r1 = img.data[i1];
      const g1 = img.data[i1 + 1];
      const b1 = img.data[i1 + 2];
      const a1 = img.data[i1 + 3];

      const i2 = (x12 + y11 * img.width) * 4;
      const r2 = img.data[i2];
      const g2 = img.data[i2 + 1];
      const b2 = img.data[i2 + 2];
      const a2 = img.data[i2 + 3];

      const i3 = (x12 + y12 * img.width) * 4;
      const r3 = img.data[i3];
      const g3 = img.data[i3 + 1];
      const b3 = img.data[i3 + 2];
      const a3 = img.data[i3 + 3];

      const i4 = (x11 + y12 * img.width) * 4;
      const r4 = img.data[i4];
      const g4 = img.data[i4 + 1];
      const b4 = img.data[i4 + 2];
      const a4 = img.data[i4 + 3];

      const r = linearColor(x1, y1, x11, x12, y11, y12, r1, r2, r3, r4);
      const g = linearColor(x1, y1, x11, x12, y11, y12, g1, g2, g3, g4);
      const b = linearColor(x1, y1, x11, x12, y11, y12, b1, b2, b3, b4);
      const a = linearColor(x1, y1, x11, x12, y11, y12, a1, a2, a3, a4);

      const rrow = row - tile.top;
      const rcol = col - tile.left;
      const rIndex = (rcol + rrow * tile.width) * 4;

      result.data[rIndex]     = r;
      result.data[rIndex + 1] = g;
      result.data[rIndex + 2] = b;
      result.data[rIndex + 3] = a;
    }
  }

  return result;
}

export function operatorScale(px, py, srcX, srcY, params, a) {
  const {xc, yc, prevXc, prevYc, scaleValue, r} = params;

  let d2 = (px - xc)*(px - xc) + (py - yc)*(py - yc);
  let r2 = r*r;
  if (d2 < r2) {
    let decay = (scaleValue - 1) * (1 - d2/r2) + 1;

    a[0] = decay * (srcX - prevXc) + prevXc;
    a[1] = decay * (srcY - prevYc) + prevYc;
  } else {
    a[0] = srcX;
    a[1] = srcY;
  }
}

export function operatorPush(px, py, srcX, srcY, params, a) {
  const {xc, yc, prevXc, prevYc, startXc, startYc, r, pushValue} = params;

  let dx = xc - prevXc;
  let dy = yc - prevYc;

  let d2 = (px - xc)*(px - xc) + (py - yc)*(py - yc);
  let r2 = r*r;
  if (d2 < r2) {
    let decay = pushValue*(1 - Math.sqrt(d2/r2));

    a[0] = srcX - dx * decay;
    a[1] = srcY - dy * decay;
  } else {
    a[0] = srcX;
    a[1] = srcY;
  }
}

export function operatorInverse(px, py, srcX, srcY, params, a) {
  const {xc, yc, r} = params;
  
  const d2 = (px - xc)*(px - xc) + (py - yc)*(py - yc);
  if (d2 < 1e-12) return [px, py];

  const r2 = r*r;
  //if (d2 < r2) {
    const x1 = (px - xc) / d2 * r2;
    const y1 = (py - yc) / d2 * r2;
    a[0] = x1 + xc;
    a[1] = y1 + yc;
  // } else {
  //   a[0] = srcX;
  //   a[1] = srcY;
  // }
}

export function operatorUndo(px, py, srcX, srcY, params, a) {
  const {xc, yc, r} = params;

  let d2 = (px - xc)*(px - xc) + (py - yc)*(py - yc);
  let r2 = r*r;
  if (d2 < r2) {
    let p = 0.5*(1 - d2/r2);
    a[0] = px * p + srcX * (1-p);
    a[1] = py * p + srcY * (1-p);
  } else {
    a[0] = srcX;
    a[1] = srcY;
  }
}

export function operatorWawe(px, py, srcX, srcY, params, a) {
  const {w, h, xc, yc, r} = params;

  let d2 = (px - xc)*(px - xc) + (py - yc)*(py - yc);
  let r2 = r*r;
  const f = w/100;
  const amp = r/200;
  if (d2 < r2) {
    let p = 1*(1 - d2/r2);
    let dx = p*amp * Math.sin(f * px / w * Math.PI * 2);
    let dy = p*amp * Math.cos(f * py / h * Math.PI * 2);
    a[0] = srcX + dx;
    a[1] = srcY + dy;
  } else {
    a[0] = srcX;
    a[1] = srcY;
  }
}

export function goo(operator, w, h, imgBuffer, tile, params) {
  let result = new Float64Array(tile.width*2*tile.height);

  let a = [0, 0];
  for (let dstY = tile.top; dstY < tile.top + tile.height; dstY++) {
    for (let dstX = tile.left; dstX < tile.left + tile.width; dstX++) {
      let si = dstY*w*2 + dstX*2;
      let srcX = imgBuffer[si];
      let srcY = imgBuffer[si + 1];
      operator(dstX, dstY, srcX, srcY, params, a);

      let ri = 2 * ((dstY - tile.top)*tile.width + dstX - tile.left);
      result[ri]     = a[0];
      result[ri + 1] = a[1];
    }
  }

  return result;
}

export function scaleImgBuffer(imgBuffer, fromWidth, fromHeight, toWidth, toHeight, tile) {
  let result = new Float64Array(tile.width*2*tile.height);
  let destIdx = 0;
  let xs = fromWidth / toWidth;
  let ys = fromHeight / toHeight;
  for (let y = tile.top; y < tile.top + tile.height; y++) {
    for (let x = tile.left; x < tile.left + tile.width; x++) {
      let x11 = Math.floor(x * xs);
      let x12 = Math.ceil(x * xs);
      let y11 = Math.floor(y * ys);
      let y12 = Math.ceil(y * ys);

      let i1 = 2*(y11*fromWidth + x11);
      let rx1 = imgBuffer[i1++] / xs;
      let ry1 = imgBuffer[i1] / ys;
      let i2 = 2*(y11*fromWidth + x12);
      let rx2 = imgBuffer[i2++] / xs;
      let ry2 = imgBuffer[i2] / ys;
      let i3 = 2*(y12*fromWidth + x12);
      let rx3 = imgBuffer[i3++] / xs;
      let ry3 = imgBuffer[i3] / ys;
      let i4 = 2*(y12*fromWidth + x11);
      let rx4 = imgBuffer[i4++] / xs;
      let ry4 = imgBuffer[i4] / ys;

      result[destIdx++] = linear4(x*xs, y*ys, x11, x12, y11, y12, rx1, rx2, rx3, rx4);
      result[destIdx++] = linear4(x*xs, y*ys, x11, x12, y11, y12, ry1, ry2, ry3, ry4);
    }
  }

  return result;
}