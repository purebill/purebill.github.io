(function () {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  Keys.init(canvas);

  /** @type {HTMLCanvasElement} */
  const frameCanvas = document.createElement("canvas");
  const frameCtx = frameCanvas.getContext("2d");

  window.onresize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = "fixed";
    canvas.style.left = '0';
    canvas.style.top = '0';
    
    frameCanvas.width = canvas.width;
    frameCanvas.height = canvas.height;
  };
  window.onresize(null);

  let userId = null;
  let users = new Map();
  /**@type {Server} */
  let server = null;
  /**@type {Game} */
  let game = null;

  Math.seedrandom();
  
  game = new Game(frameCtx);
  game.frameCallback = () => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(frameCanvas, 0, 0);
  };
  game.startFromTheBeginning();
})();
