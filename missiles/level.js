class Level {
  constructor() {
    this.level = 1;

    this.missileMaxCount = 1;
    this.missileProbability = 0.5;
    this.missilePeriod = 1000;

    this.starProbability = 0.5;
    this.starPeriod = 1000;
    this.starMaxCount = 1;

    this.lifePeriod = 5000;
    this.lifeProbability = 0.2;
    this.lifeMaxCount = 1;

    this.fontSize = 12;
  }

  /**
   * @param {Game} game 
   */
  init(game) {
    this.game = game;

    this._tryToCreate(Missile,
      () => this.missileProbability,
      () => this.missileMaxCount,
      () => {
        const screenSize = Math.max(game.ctx.canvas.width/2, game.ctx.canvas.height/2);
        const mxy = V.add(game.plane.xy, V.random(screenSize + Math.random()*screenSize));
        return new Missile(mxy, game.plane);
      },
      () => this.missilePeriod);
    
    this._tryToCreate(Star,
      () => this.starProbability,
      () => this.lifeMaxCount,
      () => {
        const screenSize = Math.max(game.ctx.canvas.width/2, game.ctx.canvas.height/2);
        const sxy = V.random(screenSize/3 + Math.random()*screenSize);
        return new Star(this.game.wrapAround(sxy));
      },
      () => this.starPeriod);
    
    this._tryToCreate(Life,
      () => this.lifeProbability,
      () => this.lifeMaxCount,
      () => {
        const screenSize = Math.max(game.ctx.canvas.width/2, game.ctx.canvas.height/2);
        const lxy = V.random(screenSize/3 + Math.random()*screenSize);
        return new Life(lxy);
      },
      () => this.lifePeriod);

    this.game.addTrigger(scoreTrigger(this.game, 10, () => this.game.incrementLifes(1)));
    this.game.addTrigger(scoreTrigger(this.game, 5, () => this.game.incrementFakeTargets(1)));
    this.game.addTrigger(scoreTrigger(this.game, 2, () => this.game.incrementBooster(2000)));

    this._randomObstacles(true);
    this._randomClouds(true);
  }

  changed(game) { 
    this.prevState = {
      lifes: game.lifes,
      score: game.score,
      booster: game.booster,
      fakeTargets: game.fakeTargets
    };
  }

  progress(dt) {
    switch (this.level) {
      case 1:
        if (this.game.score > 4 || this.game.globalTime > 30000) {
          this.level = 2;
          this.missileMaxCount = 2;
        }
        break;
  
      case 2:
        if (this.game.globalTime > 60000) {
          this.level = 3;
          this.missileMaxCount = 3;
          this.missileProbability = 1;
        }
        break;
    }
  }

  onDeadMissile() {
    this.game.incrementScore(1);
  }

  drawPre(ctx) {

  }

  drawPost(ctx) {
    const lineHeight = this.fontSize * 1.1;
    let y = lineHeight;
    
    ctx.fillStyle = "black";
    ctx.font = this.fontSize + "px sefif";
    ctx.fillText("FPS: " + Math.round(this.game.fps), 0, y);
    y += lineHeight;

    ctx.fillStyle = "black";
    ctx.font = this.fontSize + "px sefif";
    ctx.fillText("Time: " + (Math.round(this.game.globalTime / 1000)), 0, y);
    y += lineHeight;

    ctx.fillStyle = "black";
    ctx.font = this.fontSize + "px sefif";
    ctx.fillText("Score: " + this.game.score, 0, y);
    y += lineHeight;

    if (this.game.fakeTargets > 0) {
      ctx.fillStyle = "black";
      ctx.font = this.fontSize + "px sefif";
      ctx.fillText("Fake targets: " + this.game.fakeTargets, 0, y);
      y += lineHeight;
    }

    if (this.game.booster > 0) {
      ctx.fillStyle = "black";
      ctx.font = this.fontSize + "px sefif";
      ctx.fillText("Booster: " + Math.round(this.game.booster / 1000) + " sec", 0, y);
      y += lineHeight;
    }

    ctx.fillStyle = "black";
    ctx.font = this.fontSize + "px sefif";
    ctx.fillText("Lifes: " + this.game.lifes, 0, y);
    y += lineHeight;

    ctx.save();
    this._drawRadar(ctx);
    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} targetCtx
   */
  _drawRadar(targetCtx) {
    const radarR = 100;
    const z = 20;

    if (!this.radarCtx) {
      const radarCanvas = document.createElement("canvas");
      radarCanvas.width = 2*radarR + 5;
      radarCanvas.height = 2*radarR + 5;
      this.radarCtx = radarCanvas.getContext("2d");
    }

    const ctx = this.radarCtx;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    ctx.save();

    ctx.clearRect(0, 0, w, h);

    const aspect = targetCtx.canvas.height/targetCtx.canvas.width;
    ctx.scale(1, aspect);

    const rx = w/2;
    const ry = h/2;

    ctx.fillStyle = "#fff2e6";
    ctx.strokeStyle = "#663300";
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.stroke();
    ctx.strokeStyle = "#ffcc99";
    const N = 6;
    for (let i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      const angle = 2*Math.PI/N*i;
      ctx.lineTo(rx + Math.cos(angle)*radarR, ry + Math.sin(angle)*radarR);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(rx, ry, radarR, 0, 2*Math.PI);
    ctx.clip();

    ctx.strokeStyle = "#999999";
    ctx.beginPath();
    ctx.arc(rx, ry, targetCtx.canvas.height/2/z, 0, 2*Math.PI);
    ctx.stroke();

    ctx.scale(1/z, 1/z);
    ctx.translate(-this.game.plane.xy[0], -this.game.plane.xy[1]);
    ctx.translate(w/2*z, h/2*z);
    
    ctx.strokeStyle = "black";
    ctx.lineWidth = z;
    ctx.beginPath();
    ctx.moveTo(this.game.plane.xy[0], this.game.plane.xy[1] - 5*z/aspect);
    ctx.lineTo(this.game.plane.xy[0], this.game.plane.xy[1] + 5*z/aspect);
    ctx.moveTo(this.game.plane.xy[0] - 5*z, this.game.plane.xy[1]);
    ctx.lineTo(this.game.plane.xy[0] + 5*z, this.game.plane.xy[1]);
    ctx.stroke();
    for (let fly of this.game.flies) {
      if (fly instanceof Missile || fly instanceof Perk) {
        ctx.save();
        ctx.fillStyle = fly instanceof Missile ? "#ff0000" : "#000000";
        ctx.beginPath();
        ctx.ellipse(fly.xy[0], fly.xy[1], 2*z, 2*z/aspect, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();
      } else {
        // fly.draw(ctx);
      }
    }

    ctx.restore();

    targetCtx.globalAlpha = 0.9;
    targetCtx.drawImage(ctx.canvas, targetCtx.canvas.width - 2*radarR - 10, 10);
  }

  _tryToCreate(clazz, probability, maxCount, creator, period, notFirst) {
    if (notFirst) {
      if (Math.random() < probability()) {
        if (this.game.flies.filter(o => o instanceof clazz).length < maxCount()) {
          let entity, colides;
          do {
            entity = creator();
            colides = false;
            for (const f of this.game.flies) {
              if (f.colideWith(entity)) colides = true;
            }
          } while(colides);
      
          this.game.addEntity(entity);      
        }
      }
    }

    Timer.set(() => this._tryToCreate(clazz, probability, maxCount, creator, period, true), period());
  }

  _randomClouds(initial) {
    if (!this.game.plane) return;

    const N = initial ? 20 : 1;
    for (let i = 0; i < N; i++) {
      const w = this.game.ctx.canvas.width;
      const h = this.game.ctx.canvas.height;
      let xc = this.game.plane.xy[0] + w - 2 * Math.random() * w;
      let yc = this.game.plane.xy[1] + h - 2 * Math.random() * h;
      this.game.addEntity(new Cloud([xc, yc]));
    }

    // Timer.set(() => this._randomClouds(false), 5000 + Math.random() * 5000);
  }

  _randomObstacles(initial) {
    if (!this.game.plane) return;

    const N = initial ? 20 : 1;
    for (let i = 0; i < N; i++) {
      let collided = false;
      let obstacle;
      do {
        const w = this.game.ctx.canvas.width;
        const h = this.game.ctx.canvas.height;
        let xc = this.game.plane.xy[0] + w - 2 * Math.random() * w;
        let yc = this.game.plane.xy[1] + h - 2 * Math.random() * h;
        let r = 20 + Math.random() * 30;
        const N = Math.round(3 + Math.random()*10);
        const vertices = [];
        for (let i = 0; i < N; i++) {
          const x = r * Math.cos(2*Math.PI/N*i);
          const y = r * Math.sin(2*Math.PI/N*i);
          vertices.push([xc + x, yc + y]);
        }
        obstacle = new Obstacle(new ConvexPolygonRegion(vertices));
        collided = false;
        for (let fly of this.game.flies) {
          if (fly.colideWith(obstacle)) collided = true;
        }
      } while (collided);
      this.game.addEntity(obstacle);
    }

    // Timer.set(() => this._randomObstacles(false), 1000 + Math.random() * 4000);
  }
}

/**
 * 
 * @param {Game} game 
 * @param {number} incrementScore 
 * @param {() => any} callback 
 */
function scoreTrigger(game, incrementScore, callback) {
  let lastScore = game.score;
  return () => {
    if (game.score - lastScore >= incrementScore) {
      lastScore = game.score;
      callback();
    }
  };
}