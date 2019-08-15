var Loop = (function () {
  let renders = [];
  let paused = false;

  let canvas = document.createElement("canvas");
  let aspect;
  function onResize() {
    canvas.width = window.innerWidth - 50;
    canvas.height = window.innerHeight - 50;
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";
    canvas.style.display = "";
    canvas.style.position = "fixed";
    canvas.style.left = '0';
    canvas.style.top = '0';

    aspect = canvas.height / canvas.width;

    render();
  }
  window.onresize = onResize;
  onResize();
  document.body.appendChild(canvas);

  let startTime = new Date().getTime();

  function loop() {
    if (paused) return;

    Timer.progress(new Date().getTime() - startTime);
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
    },
    add,
    remove,
    pause,
    resume,
    paused: () => paused
  }
})();