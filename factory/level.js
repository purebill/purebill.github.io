class Level {
  constructor(factories, routers, maxPower) {
    this.factories = factories;
    this.routers = routers;
    this.maxPower = maxPower;
  }

  createWorld() {
    throw new Error("Not implemented");
  }

  /**
   * @return {Level}
   */
  nextLevel() {
    throw new Error("Not implemented");
  }

  startBuildDelay(cell) {
    const str = prompt("Delay, ms");
    if (str === null) return;
    const delayMs = parseInt(str);
    if (isNaN(delayMs)) return;

    buildDelay(cell.x, cell.y, delayMs, 10);
  }

  startBuildCountingRouter(cell) {
    const str = prompt("Count");
    if (str === null) return;
    let count = parseInt(str);
    if (isNaN(count)) return;

    buildCountingRouter(cell.x, cell.y, count, 10);
  }

  startBuildSeparator(cell) {
    const str = prompt("Thing to separate");
    if (str === null) return;

    buildSeparator(cell.x, cell.y, str, 10);
  }
}

class LevelItem {
  constructor(name, callback) {
    this.name = name;
    this.callback = callback;
  }
}

class Level1 extends Level {
  constructor() {
    const factories = [];
    const routers = [];
  
    factories.push(new LevelItem(
      "F1",
      cell => buildFacility(cell.x, cell.y,
        "stuff -> catalyst | *,catalyst -> gold",
        10, "F1")));
  
    routers.push(new LevelItem("Separator", cell => this.startBuildSeparator(cell)));
    routers.push(new LevelItem("Round Robin", cell => buildRoundRobinRouter(cell.x, cell.y)));
    routers.push(new LevelItem("Counting Router", cell => this.startBuildCountingRouter(cell)));
    routers.push(new LevelItem("Delay", cell => this.startBuildDelay(cell)));

    super(factories, routers, 100);
  }

  createWorld() {
    const source = buildThingSource(15, 10, "stuff", 2, 0, 10);
    buildSink(6, 4, "gold");
    const f1 = buildFacility(10, 11,
      "stuff -> catalyst | *,catalyst -> gold",
      10, "F1");
    connect(source, f1, PathFinder.find(source.hexaCell, f1.hexaCell, []));

    const router = buildRoundRobinRouter(8, 11);
    connect(f1, router, PathFinder.find(f1.hexaCell, router.hexaCell, []));

    connect(router, router, new PathBuilder(router.hexaCell).lu().lu().ru().ru().d().d().build());
  }

  nextLevel() {
    return new Level2();
  }
}

class Level2 extends Level {
  constructor() {
    const factories = [];
    factories.push(new LevelItem(
      "NOT",
      cell => buildFacility(cell.x, cell.y,
        "0 -> 1 | 1 -> 0",
        10, "NOT")));
    factories.push(new LevelItem(
      "AND",
      cell => buildFacility(cell.x, cell.y,
        "0,0 -> 0 | 0,1 -> 0 | 1,0 -> 0 | 1,1 -> 1",
        10, "AND")));
    factories.push(new LevelItem(
      "OR",
      cell => buildFacility(cell.x, cell.y,
        "0,0 -> 0 | 0,1 -> 1 | 1,0 -> 1 | 1,1 -> 1",
        10, "OR")));

    const routers = [];
    routers.push(new LevelItem("Separator", cell => this.startBuildSeparator(cell)));
    routers.push(new LevelItem("Round Robin", cell => buildRoundRobinRouter(cell.x, cell.y)));
    routers.push(new LevelItem("Counting Router", cell => this.startBuildCountingRouter(cell)));
    routers.push(new LevelItem("Delay", cell => this.startBuildDelay(cell)));

    super(factories, routers, 100);
  }

  createWorld() {
    buildThingSource(15, 10, "0", 10, 1000, 10);
    buildSink(6, 4, "101");
  }

  nextLevel() {
    return new Level1();
  }
}