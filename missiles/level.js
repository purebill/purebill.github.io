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
        let x, y;
        if (Math.random() > 0.5) {
          x = Math.random() * game.ctx.canvas.width;
          y = Math.random() > 0.5 ? 0 : game.ctx.canvas.height;
        } else {
          x = Math.random() > 0.5 ? 0 : game.ctx.canvas.width;
          y = Math.random() * game.ctx.canvas.height;
        }
        return new Missile(V.add(game.plane.xy, V.random(game.ctx.canvas.width)), game.plane);
      },
      () => this.missilePeriod);
    
    this._tryToCreate(Star,
      () => this.starProbability,
      () => this.lifeMaxCount,
      () => {
        const minL = 50;
        const maxL = 300;
        const starV = this.game.wrapAround(V.add(this.game.plane.xy, V.random(minL + Math.random() * (maxL - minL))));
        return new Star(starV);
      },
      () => this.starPeriod);
    
    this._tryToCreate(Life,
      () => this.lifeProbability,
      () => this.lifeMaxCount,
      () => new Life([Math.random()*this.game.ctx.canvas.width, Math.random()*this.game.ctx.canvas.height]),
      () => this.lifePeriod);

    this.game.addTrigger(scoreTrigger(this.game, 10, () => this.game.incrementLifes(1)));
    this.game.addTrigger(scoreTrigger(this.game, 5, () => this.game.incrementFakeTargets(1)));
    this.game.addTrigger(scoreTrigger(this.game, 2, () => this.game.incrementBooster(2000)));

    this._randomObstacles();
    this._randomClouds();
  }

  changed(game) {
    // if (this.prevState) {
    //   if (this.prevState.lifes < game.lifes
    //     || this.prevState.booster < game.booster
    //     || this.prevState.fakeTargets < game.fakeTargets) {
    //     this.fontSize = 20;
    //     Timer.set(() => this.fontSize = 12, 2000);
    //   }
    // }
    
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

  _randomClouds() {
    if (!this.game.plane) return;

    for (let i = 0; i < 20; i++) {
      const w = this.game.ctx.canvas.width;
      const h = this.game.ctx.canvas.height;
      let xc = this.game.plane.xy[0] + w - 2 * Math.random() * w;
      let yc = this.game.plane.xy[1] + h - 2 * Math.random() * h;
      this.game.addEntity(new Cloud([xc, yc]));
    }

    // Timer.set(() => this._randomClouds(), 1000 + Math.random() * 4000);
  }

  _randomObstacles() {
    if (!this.game.plane) return;

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

    Timer.set(() => this._randomObstacles(), 1000 + Math.random() * 4000);
  }
}