import GamePlugins from './plugins.js'
import Timer from './timer.js';
import { Plane, Missile } from './model.js';
import V from './vector.js';

GamePlugins.register("debug", [], game => {
  game.plane.lifes = 100;

  Timer.periodic(() => {
    game.flies
        .filter(it => it instanceof Plane)
        .forEach(it => it.addInfo("debug", () => T.life + " " + it.lifes));
    
    // game.flies
    //     .filter(it => it instanceof Plane || it instanceof Missile)
    //     .forEach(it => {
    //       if (!it.__debug) {
    //         it.__debug = true;
    //         it.enhanceDrawWith(draw);
    //       }
    //     });
  }, 1000);

  /**
   * @param {CanvasRenderingContext2D} ctx
   */
  function draw(ctx) {
    ctx.fillStyle = "#000000";
    ctx.font = "12px serif";
    ctx.fillText(this.xy.map(it => it.toFixed(0)), this.xy[0], this.xy[1] + 20);

    if (this instanceof Missile && this.target) {
      if (this.target) {
        ctx.strokeStyle = "#ff9999";
        ctx.beginPath();
        ctx.moveTo(this.xy[0], this.xy[1]);
        ctx.lineTo(this.target.xy[0], this.target.xy[1]);
        ctx.stroke();
      }

      game.flies
          .filter(it => it instanceof Plane)
          .filter(it => it !== this.target)
          .filter(it => V.dotProduct(V.subtract(it.xy, this.xy), this.v) >= 0)
          .forEach(p => {
            ctx.strokeStyle = "#ff9999";
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(this.xy[0], this.xy[1]);
            ctx.lineTo(p.xy[0], p.xy[1]);
            ctx.stroke();
          });
    }
  }
});