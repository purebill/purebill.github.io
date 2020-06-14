class Overlay {
  drawPre(ctx) {
  }

  drawPost(ctx) {
  }
}

class Level extends Overlay {
  constructor() {
    super();
    
    this.level = 1;

    this.missileMaxCount = 1;
    this.missileProbability = 0.5;
    this.missilePeriod = 1000;
    this.missileSpawnRadiusMin = 1000;
    this.missileSpawnRadiusMax = 2000;

    this.starProbability = 0.5;
    this.starPeriod = 1000;
    this.starMaxCount = 1;
    this.starSpawnRadiusMin = 400;
    this.starSpawnRadiusMax = 2000;

    this.lifePeriod = 5000;
    this.lifeProbability = 0.2;
    this.lifeMaxCount = 1;
    this.lifeSpawnRadiusMin = 400;
    this.lifeSpawnRadiusMax = 2000;

    this.cloudSpawnRadiusMax = 2000;
    this.obstacleSpawnRadiusMax = 2000;
    this.outOfRangeRadius = 6000;
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
        const mxy = V.add(game.plane.xy, V.random(this.missileSpawnRadiusMin + Math.random()*(this.missileSpawnRadiusMax - this.missileSpawnRadiusMin)));
        return new Missile(mxy, game.plane);
      },
      () => this.missilePeriod);
    
    this._tryToCreate(Star,
      () => this.starProbability,
      () => this.lifeMaxCount,
      () => {
        const sxy = V.random(this.starSpawnRadiusMin + Math.random()*(this.starSpawnRadiusMax - this.starSpawnRadiusMin));
        return new Star(this.game.wrapAround(sxy));
      },
      () => this.starPeriod);
    
    this._tryToCreate(Life,
      () => this.lifeProbability,
      () => this.lifeMaxCount,
      () => {
        const lxy = V.random(this.starSpawnRadiusMin + Math.random()*(this.starSpawnRadiusMax - this.starSpawnRadiusMin));
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
    if (V.length(this.game.plane.xy) > this.outOfRangeRadius) {
      this.game.outOfRange = true;
      this.level = Infinity;
      this.missileMaxCount = 100;
      this.missileProbability = 1;
    }

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

  /**
   * @param {Missile} missile 
   */
  onDeadMissile(missile) {
    this.game.incrementScore(1, missile);
  }

  _tryToCreate(clazz, probability, maxCount, creator, period, notFirst) {
    if (notFirst && (this.game.localMode || this.game.masterGameNode)) {
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
      let xy = V.random(Math.random() * this.cloudSpawnRadiusMax);
      this.game.addEntity(new Cloud(xy));
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
        let xy = V.random(Math.random() * this.obstacleSpawnRadiusMax);
        let r = 20 + Math.random() * 30;
        const N = Math.round(3 + Math.random()*10);
        const vertices = [];
        for (let i = 0; i < N; i++) {
          const x = r * Math.cos(2*Math.PI/N*i);
          const y = r * Math.sin(2*Math.PI/N*i);
          vertices.push([xy[0] + x, xy[1] + y]);
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