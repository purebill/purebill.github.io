function convolute(img, kernel, tile) {
  var result = new ImageData(tile.width, tile.height);

  var kcrow = (kernel.height - 1) / 2;
  var kccol = (kernel.width - 1) / 2;

  for (var row = tile.top; row < tile.top + tile.height; row++) {
    for (var col = tile.left; col < tile.left + tile.width; col++) {
      var r2 = 0;
      var g2 = 0;
      var b2 = 0;

      for (var krow = 0; krow < kernel.height; krow++) {
        for (var kcol = 0; kcol < kernel.width; kcol++) {
          var row2 = row + krow - kcrow;
          var col2 = col + kcol - kccol;

          var r, g, b;
          if (row2 < 0 || row2 >= img.height || col2 < 0 || col2 >= img.width) {
            let baseIndex = (col + row * img.width) * 4;
            r = img.data[baseIndex];
            g = img.data[baseIndex + 1];
            b = img.data[baseIndex + 2];
          } else {
            let baseIndex = (col2 + row2 * img.width) * 4;
            r = img.data[baseIndex];
            g = img.data[baseIndex + 1];
            b = img.data[baseIndex + 2];
          }

          var v = kernel.data[kcol + krow * kernel.width];
          r2 += r * v;
          g2 += g * v;
          b2 += b * v;
        }
      }

      var rrow = row - tile.top;
      var rcol = col - tile.left;

      let baseIndex = (rcol + rrow * tile.width) * 4;
      result.data[baseIndex]     = Math.round(r2);
      result.data[baseIndex + 1] = Math.round(g2);
      result.data[baseIndex + 2] = Math.round(b2);
      result.data[baseIndex + 3] = 255;
    }
  }

  return result;
}
