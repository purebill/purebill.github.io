var Tile = (function () {
  /**
   * @param {number} x 
   * @param {number} y 
   * @param {number} zoomLevel 
   * @returns {String} address
   */
  function fromCoords(x, y, zoomLevel) {
    if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error("Bad coords");

    let address = "";
    if (zoomLevel <= 0) return address;

    let x1 = 0, y1 = 1, x2 = 1, y2 = 0;
    for (let level = 0; level < zoomLevel; level++) {
      let d = 0;

      if (x >= (x1 + x2) / 2) {
        d |= 1;
        x1 = (x1 + x2) / 2;
      } else {
        x2 = (x1 + x2) / 2;
      }

      if (y > (y1 + y2) / 2) {
        d |= 2;
        y2 = (y1 + y2) / 2;
      } else {
        y1 = (y1 + y2) / 2;
      }

      address += d.toString();
    }

    return address;
  }

  /**
   * @param {String|number} address 
   * @returns {number[][]} rectangle top-left (inclusive), bottom-right (exclusive)
   */
  function toRect(address) {
    if (typeof address == "number") address = new Number(address).toString(4);

    if (address.length == 0) return [[0, 0], [1, 1]];

    const digits = address.split("").map(it => parseInt(it));
    
    let x1 = 0, y1 = 1, x2 = 1, y2 = 0;
    for (let level = 0; level < digits.length; level++) {
      const d = digits[level]
      if (d < 0 || d > 3) throw new Error("Bad address");
      
      if (d & 1) x1 = (x1 + x2) / 2;
      else x2 = (x1 + x2) / 2;

      if (d & 2) y2 = (y1 + y2) / 2;
      else y1 = (y1 + y2) / 2;
    }

    return [[x1, y1], [x2, y2]];
  }

  return {
    fromCoords,
    toRect
  };
}) ();