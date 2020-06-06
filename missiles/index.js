/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
Keys.init(canvas);
const ctx = canvas.getContext("2d");

/** @type {HTMLCanvasElement} */
const frameCanvas = document.createElement("canvas");
const frameCtx = frameCanvas.getContext("2d");

window.onresize = () => {
  canvas.width = window.innerWidth - 20;
  canvas.height = window.innerHeight - 20;
  frameCanvas.width = canvas.width;
  frameCanvas.height = canvas.height;
};
window.onresize();

const game = new Game(frameCtx);
game.frameCallback = drawFrame;
game.init();
game.startFromTheBeginning();

function drawFrame() {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(frameCanvas, 0, 0);
}