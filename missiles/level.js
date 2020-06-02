class Level {
  constructor() {
    this.level = 1;

    this.missileMaxCount = 1;
    this.missileProbability = 0.5;
    this.missilePeriod = 1000;

    this.starProbability = 0.8;
    this.starPeriod = 1000;
    this.starMaxCount = 1;

    this.lifePeriod = 5000;
    this.lifeProbability = 0.5;
    this.lifeMaxCount = 1;
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
        return new Missile([x, y], game.plane);
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

    this.game.addTrigger(scoreTrigger(this.game, 5, () => this.game.incrementLifes(1)));
    this.game.addTrigger(scoreTrigger(this.game, 1, () => this.game.incrementBooster(2000)));

    this._randomObstacles();
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
    const fontSize = 12;
    const lineHeight = fontSize * 1.1;
    ctx.fillStyle = "black";
    ctx.font = fontSize + "px sefif";
    let line = 1;
    ctx.fillText("FPS: " + Math.round(this.game.fps), 0, line++ * lineHeight);
    ctx.fillText("Time: " + (Math.round(this.game.globalTime / 1000)), 0, line++ * lineHeight);
    ctx.fillText("Score: " + this.game.score, 0, line++ * lineHeight);
    if (this.game.booster > 0) {
      ctx.fillText("Booster: " + Math.round(this.game.booster / 1000) + " sec", 0, line++ * lineHeight);
    }
    ctx.fillText("Lifes: " + this.game.lifes, 0, line++ * lineHeight);
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

  _randomObstacles() {
    let collided = false;
    let obstacle;
    do {
      let xc = Math.random() * this.game.ctx.canvas.width;
      let yc = Math.random() * this.game.ctx.canvas.height;
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

    Timer.set(() => this._randomObstacles(), 3000/*10000 + Math.random() * 50000*/);
  }
}