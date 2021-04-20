(function () {
  const dx = 200;
  const dy = 200;
  const r = 100;

  const c = document.getElementById("original");
  let ctx;

  window.onresize = () => init(window.innerWidth, window.innerHeight);
  init(window.innerWidth, window.innerHeight);

  c.onmousemove = e => {
    clear();

    const x = e.offsetX - dx;
    const y = e.offsetY - dy;

    circle(x, y, 3);
    line(0, 0, x, y);

    const [x1, y1] = invert(x, y, r);
    circle(x1, y1, 3);
  };

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function init(w, h) {
    c.width = w;
    c.height = h;
    ctx = c.getContext("2d");
    ctx.translate(dx, dy);
    clear();
  }

  function clear() {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.clearRect(-dx, -dy, c.width, c.height);
    circle(0, 0, r);
  }
})();
