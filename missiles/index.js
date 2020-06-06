const canvas = document.getElementById("canvas");
Keys.init(canvas);
const ctx = canvas.getContext("2d");

window.onresize = () => {
  canvas.width = window.innerWidth - 20;
  canvas.height = window.innerHeight - 20;
};
window.onresize();

const game = new Game(ctx);
game.init();
game.startFromTheBeginning();