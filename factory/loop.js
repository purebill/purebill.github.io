var Loop = (function () {
  let renders = [];
  let paused = false;
  let speedCoef = 1.0;

  const canvas = document.createElement("canvas");

  function onResize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    canvas.style.display = "";
    canvas.style.position = "fixed";
    canvas.style.left = '0';
    canvas.style.top = '0';

    render();
  }
  window.onresize = onResize;
  onResize();
  document.body.appendChild(canvas);

  let startTime = new Date().getTime();

  function loop() {
    if (paused) return;

    let msPassed = (new Date().getTime() - startTime) * speedCoef;
    Timer.progress(msPassed);
    startTime = new Date().getTime();

    render();

    window.requestAnimationFrame(loop);
  }

  function render() {
    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let node of renders) {
      ctx.save();
      try {
        node.draw(ctx);
      } finally {
        ctx.restore();
      }
    }
  }

  function add(node) {
    renders.push(node);
  }

  function pause() {
    paused = true;
  }

  function resume() {
    if (!paused) return;

    startTime = new Date().getTime();
    paused = false;
    loop();
  }

  function remove(node) {
    const idx = renders.indexOf(node);
    if (idx !== -1) renders.splice(idx, 1);
  }

  return {
    start: () => {
      Keys.init(canvas);
      loop();
      return canvas;
    },
    add,
    remove,
    pause,
    resume,
    paused: () => paused,
    clear: () => {
      renders = [];
      paused = false;
    },
    getSpeedCoef: () => speedCoef,
    setSpeedCoef: value => speedCoef = value
  }
})();