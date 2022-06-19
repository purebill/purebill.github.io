import { distanceChebyshev, distanceEuclidean, distanceFlatTorus, distanceManhatten, distanceMinkovski3, renderVoronoiDiagram } from "./voronoi.js";
import { Workerp } from "./workerp.js";

let nodes = [];
const distFuns = new Map();
[distanceEuclidean, distanceManhatten, distanceMinkovski3, distanceChebyshev, distanceFlatTorus]
    .forEach(f => distFuns.set(f.name, f));

Workerp.message(params => {
  if (params.seeds) {
    nodes = params.seeds;
    return Promise.resolve(true);
  }
  else if (params.tile) {
    let imd = renderVoronoiDiagram(nodes, params.tile, distFuns.get(params.distFun), params.randomnessFactor, params.width, params.height);
    return Promise.resolve(imd);
  }

  throw new Error("Unrecognized command: " + params);
});