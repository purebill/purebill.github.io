let PathFinder = (function () {
  function h(cell, cellTo) {
    return Math.sqrt(Math.pow(cell.xc - cellTo.xc, 2) + Math.pow(cell.yc - cellTo.yc, 2));;
  }

  function addToOpenSet(openSet, openSetSet, it, score) {
    if (openSetSet.has(it)) return;
    openSetSet.add(it);

    it.score = score;
    let i;
    for (i = 0; i < openSet.length; i++) {
      const e = openSet[i];
      if (e.score > score) break;
    }
    openSet.splice(i, 0, it);
    openSetSet.add(it);
  }

  function get(gScore, cell) {
    if (!gScore.has(cell)) return 1e20;
    return gScore.get(cell);
  }

  function find(cellFrom, cellTo) {
    if (cellFrom === cellTo) return [cellFrom];

    let closedSet = new Set();

    let gScore = new Map();
    gScore.set(cellFrom, 0);

    let fScore = new Map();
    fScore.set(cellFrom, 0);

    let openSet = [cellFrom];
    let openSetSet = new Set();

    while (openSet.length > 0) {
      let current = openSet.shift();
      openSetSet.delete(current);

      if (current === cellTo) {
        let path = [];
        
        path.unshift(current);
        do {
          current = current.backLink;
          path.unshift(current);
        } while (current !== cellFrom);

        return path;
      }

      closedSet.add(current);

      current.neighbours()
        .filter(it => !closedSet.has(it))
        .filter(it => it.things.length == 0 || it === cellTo)
        .forEach(neighbour => {
          let score = get(gScore, current) + 1;
          if (score < get(gScore, neighbour)) {
            neighbour.backLink = current;
            gScore.set(neighbour, score);
            fScore.set(neighbour, h(neighbour, cellTo));
          }
          addToOpenSet(openSet, openSetSet, neighbour, score + get(fScore, neighbour));
        });
    }

    return [];
  }

  return {
    find
  }
})();