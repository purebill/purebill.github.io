export class Patch {
  /**@type {number} */
  left;
  /**@type {number} */
  top;
  /**@type {number} */
  width;
  /**@type {number} */
  height;
  /**@type {Float64Array} */
  buffer;

  /**
   * @param {number} left
   * @param {number} top
   * @param {number} width
   * @param {number} height
   * @param {Float64Array} buffer
   */
  constructor(left, top, width, height, buffer) {
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = height;
    this.buffer = buffer;
  }

  /**
   * @param {Float64Array} toBuffer
   * @param {number} toWidth
   * @param {number} toHeight
   */
  apply(toBuffer, toWidth, toHeight) {
    let si = 0;
    let di = 2*(this.top * toWidth + this.left);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        toBuffer[di++] = this.buffer[si++];
        toBuffer[di++] = this.buffer[si++];
      }
      di += 2*(toWidth - this.width);
    }
  }
}

/**
 * @param {Float64Array} fromBuffer
 * @param {Float64Array} toBuffer
 * @param {number} width
 * @param {number} height
 * @returns {Patch[]}
 */
export function diff(fromBuffer, toBuffer, width, height) {
  if (fromBuffer.length != width*height*2 || toBuffer.length != width*height*2) throw new Error("Bad size");

  let diffBuffer = new Float64Array(width*height*2);
  for (let i = 0; i < fromBuffer.length; i++) {
    const fromValue = fromBuffer[i];
    const toValue   = toBuffer[i];
    diffBuffer[i] = toValue - fromValue;
  }

  const epsilon = 1e-6;
  let i = 0;
  let y1Found = false;
  let x1 = width - 1, x2 = 0, y1, y2;
  for (let y = 0; y < height; y++) {
    let x1Found = false;
    let zeroLineFound = true;
    for (let x = 0; x < width; x++) {
      if (Math.abs(diffBuffer[i++]) < epsilon && Math.abs(diffBuffer[i++]) < epsilon) continue;
      zeroLineFound = false;

      if (!x1Found && x < x1) {
        x1 = x;
        x1Found = true;
      }
      else if (x1Found && x > x2) x2 = x;
    }
    
    if (!zeroLineFound && !y1Found) {
      y1 = y;
      y1Found = true;
    }
    else if (!zeroLineFound && y1Found) {
      y2 = y - 1;
    }
  }


  let patches = [];

  if (y1Found) {
    let patchWidth = x2 - x1 + 1;
    let patchHeight = y2 - y1 + 1;
    let buffer = new Float64Array(patchWidth * patchHeight * 2);
    let si = 0;
    let di = 2*(y1 * width + x1);
    for (let y = 0; y < patchHeight; y++) {
      for (let x = 0; x < patchWidth; x++) {
        buffer[di++] = toBuffer[si++];
        buffer[di++] = toBuffer[si++];
      }
      di += 2*(width - patchWidth);
    }

    patches.push(new Patch(x1, y1, patchWidth, patchHeight, buffer));
  }

  return patches;
}