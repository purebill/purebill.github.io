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
    canvas.style.left = 0;
    canvas.style.top = 0;

    aspect = canvas.height / canvas.width;
  }
  window.onresize = onResize;
  onResize();
  document.body.appendChild(canvas);

  function loop() {
    if (paused) return;

    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renders.forEach(render => render.call(null, ctx));

    window.requestAnimationFrame(loop);
  }

  function add(f) {
    renders.push(f);
  }

  function pause() {
    paused = true;
  }

  function resume() {
    if (!paused) return;

    paused = false;
    loop();
  }

  return {
    start: loop,
    add,
    pause,
    resume,
    paused: () => paused
  }
})();