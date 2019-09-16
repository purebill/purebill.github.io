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
  
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
  
    factories.push(new LevelItem(
      "a,a -> A",
      cell => buildFacility(cell.x, cell.y,
        alphabet.split("").map(it => it + "," + it + "->"  + it.toUpperCase()).join(" | "),
        1, 10, "a,a -> A")));
    factories.push(new LevelItem(
      "A -> a,a",
      cell => buildFacility(cell.x, cell.y,
        alphabet.split("").map(it => it.toUpperCase() + " -> " + it + "," + it).join(" | "),
        1, 10, "A -> a,a")));
    factories.push(new LevelItem(
      "a >> z", cell => {
        const rules = 
          alphabet.split("").map((it, i) => it + " -> " + alphabet[(i + 1) % alphabet.length])
          .concat(alphabet.split("").map((it, i) => it.toUpperCase() + " -> " + alphabet[(i + 1) % alphabet.length].toUpperCase()))
          .join(" | ");
        buildFacility(cell.x, cell.y, rules, 1, 10, "a >> z");
      }
    ));
    factories.push(new LevelItem(
      "a << z", cell => {
        let l = alphabet.length;
        const rules = 
          alphabet.split("").map((it, i) => it + " -> " + alphabet[(i + l - 1) % l])
          .concat(alphabet.split("").map((it, i) => it.toUpperCase() + " -> " + alphabet[(i + l - 1) % l].toUpperCase()))
          .join(" | ");
        buildFacility(cell.x, cell.y, rules, 1, 10, "a << z");
      }
    ));
  
    routers.push(new LevelItem("Separator", cell => this.startBuildSeparator(cell)));
    routers.push(new LevelItem("Round Robin", cell => buildRoundRobinRouter(cell.x, cell.y)));
    routers.push(new LevelItem("Counting Router", cell => this.startBuildCountingRouter(cell)));
    routers.push(new LevelItem("Delay", cell => this.startBuildDelay(cell)));

    super(factories, routers, 100);
  }

  createWorld() {
    buildThingSource(15, 10, "a", 10, 1000, 10);
    buildSink(6, 4, "a");
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
        1, 10, "NOT")));

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