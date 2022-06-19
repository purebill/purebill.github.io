/**
 * @param {{width: number, height: number}} img image to split into tiles
 * @param {number} S the size of a tile
 * @returns {{left: number, top: number, width: number, height: number}[]} array of tiles
 */
export function split(img, S) {
  return splitWH(img.width, img.height, S);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} S
 * @returns {{left: number, top: number, width: number, height: number}[]}
 */
export function splitWH(width, height, S) {
  var tw = Math.ceil(width / S);
  var lastW = width % S;
  var th = Math.ceil(height / S);
  var lastH = height % S;

  var tiles = [];

  for (var row = 0; row < th; row++) {
    for (var col = 0; col < tw; col++) {
      tiles.push({
        left: col * S,
        top: row * S,
        width: col * S + S <= width ? S : lastW,
        height: row * S + S <= height ? S : lastH
      });
    }
  }

  return tiles;
}
