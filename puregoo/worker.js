import { goo, gooImg, gooImgLinear, operatorInverse, operatorPush, operatorScale, operatorUndo, operatorWawe, scaleImgBuffer } from "./goo.js";
import { Workerp } from "./workerp.js";

let img, imgBuffer;

let operators = {
  scale: operatorScale,
  inverse: operatorInverse,
  push: operatorPush,
  undo: operatorUndo,
  wave: operatorWawe
}

Workerp.message(params => {
  if (params.img) {
    img = params.img;
    return Promise.resolve(true);
  }
  else if (params.imgBuffer) {
    imgBuffer = params.imgBuffer;
    return Promise.resolve(true);
  }
  else if (params.getImgBuffer) {
    return Promise.resolve(imgBuffer);
  }
  else if (operators[params.operator]) {
    return Promise.resolve(goo(operators[params.operator], params.w, params.h, imgBuffer, params.tile, params));
  }
  else if (params.scaleImgBuffer) {
    let {fromWidth, fromHeight, toWidth, toHeight, tile} = params.scaleImgBuffer;
    return Promise.resolve(scaleImgBuffer(imgBuffer, fromWidth, fromHeight, toWidth, toHeight, tile));
  }
  else if (img && imgBuffer) {
    return Promise.resolve(params.interpolation
      ? gooImgLinear(img, imgBuffer, params.tile)
      : gooImg(img, imgBuffer, params.tile));
  }
  else {
    return Promise.resolve(null);
  }
});