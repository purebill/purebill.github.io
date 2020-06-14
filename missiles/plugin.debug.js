GamePlugins.register("debug", [], game => {
  Timer.periodic(() => {
    game.flies
        .filter(it => it instanceof Plane || it instanceof Missile)
        .forEach(it => {
          if (!it.__debug) {
            it.__debug = true;
            it.enhanceDrawWith(draw);
          }
        });
  }, 1000);

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  function draw(ctx) {
    ctx.fillStyle = "#000000";
    ctx.font = "12px serif";
    ctx.fillText(this.xy.map(it => it.toFixed(0)), this.xy[0], this.xy[1] + 20);

    if (this instanceof Missile && this.target) {
      ctx.strokeStyle = "#ff9999";
      ctx.beginPath();
      ctx.moveTo(this.xy[0], this.xy[1]);
      ctx.lineTo(this.target.xy[0], this.target.xy[1]);
      ctx.stroke();
    }
  }
});