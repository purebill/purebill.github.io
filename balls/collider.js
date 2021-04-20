import {Ball, BallToBallSet, collide} from "./ball.js";
import Metrics from "./metrics.js";
import { Tree } from "./tree.js";
import V from "./vector.js";

const epsilon = 1e-6;

const collideChecksMetrics = Metrics.gauge("collide_checks");

/**
 * @param {Ball[]} balls 
 * @param {Tree} tree
 * @param {number} w
 * @param {number} h
 */
export function collider(balls, tree, w, h) {
  let checks = 0;
  let updated = balls.map(b => 0);
  let nextv = balls.map(b => [0, 0]);

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];

    for (let j = i + 1; j < balls.length; j++) {
      checks++;
      const b2 = balls[j];
      if (V.dist(b1.p, b2.p) <= b1.r + b2.r) {
        const v2 = V.subtract(b2.v, b1.v);
        const d = V.subtract(b1.p, b2.p);
        if (V.project(v2, d) > 0) {
          const [newv1, newv2] = collide(b1, b2);
          nextv[i][0] += newv1[0];
          nextv[i][1] += newv1[1];
          nextv[j][0] += newv2[0];
          nextv[j][1] += newv2[1];
          updated[i]++;
          updated[j]++;
        }
      }
    }

    let v = updated[i] ? nextv[i] : b1.v;

    if (b1.p[0] - b1.r <= 0 && v[0] < 0 || b1.p[0] + b1.r >= w && v[0] > 0) {
      if (updated[i]) {
        nextv[i][0] = -nextv[i][0];
      } else {
        nextv[i][0] = -b1.v[0];
        nextv[i][1] = b1.v[1];
        updated[i]++;
      }
    }
    if (b1.p[1] - b1.r <= 0 && v[1] < 0 || b1.p[1] + b1.r >= h && v[1] > 0) {
      if (updated[i]) {
        nextv[i][1] = -nextv[i][1];
      } else {
        nextv[i][0] = b1.v[0];
        nextv[i][1] = -b1.v[1];
        updated[i]++;
      }
    }
  }
  
  for (let i = 0; i < nextv.length; i++) {
    if (updated[i]) balls[i].v = nextv[i];
    // if (updated[i] > 1) paused = true;
  }

  collideChecksMetrics.update(checks);
}

export function touching(b1, b2) {
  const d = V.dist(b1.p, b2.p);
  return d <= b1.r + b2.r + epsilon;
}

export function catchingUp(b1, b2) {
  const v2 = V.subtract(b2.v, b1.v);
  const d = V.subtract(b1.p, b2.p);
  return V.project(v2, d) > 0;
}

/**
 * @param {Tree} tree 
 * @param {Ball} b1 
 */
export function touchingAndCluster(tree, b1) {
  let result = new Set();

  let active = new Set();
  let processed = new Set();
  let directlyTouching = new Set();

  tree.find(b1.p, b1.r).forEach(b2 => {
    if (!touching(b1, b2) || !catchingUp(b1, b2)) return;
    active.add(b2);
    result.add(b2);
    directlyTouching.add(b2);
  });
  processed.add(b1);
  directlyTouching.delete(b1);

  let lastSize;
  do {
    lastSize = result.size;

    let newActive = new Set();
    
    active.forEach(b => {
      processed.add(b);

      tree.find(b.p, b.r).forEach(b2 => {
        if (processed.has(b2)) return;
        if (!touching(b, b2) || !catchingUp(b1, b2)) return;
        newActive.add(b2);
        result.add(b2);
      });
    });

    active = newActive;
  } while (result.size > lastSize);
  
  result.delete(b1);
  return [directlyTouching, result];
}

/**
 * @param {Ball[]} balls 
 * @param {Tree} tree
 * @param {number} w
 * @param {number} h
 */
export function collider2(balls, tree, w, h, globalTime) {
  let checks = 0;
  let updated = balls.map(b => 0);
  let nextv = balls.map(b => [0, 0]);
  let ballToIdx = new Map();
  balls.forEach((b, idx) => ballToIdx.set(b, idx));

  let proessedPairs = new BallToBallSet();

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];

    const [directlyTouching, cluster] = touchingAndCluster(tree, b1);
    if (directlyTouching.size > 0) {
      let totalMass = 0;
      cluster.forEach(b => totalMass += b.m);

      let meanV = [0, 0];
      let meanP = [0, 0];
      directlyTouching.forEach(b => {
        meanP[0] += b.p[0];
        meanP[1] += b.p[1];
        meanV[0] += b.v[0];
        meanV[1] += b.v[1];
      });
      meanP[0] /= directlyTouching.size;
      meanP[1] /= directlyTouching.size;
      meanV[0] /= directlyTouching.size;
      meanV[1] /= directlyTouching.size;

      const totalb = new Ball(1, totalMass, meanP, meanV);
      const [newv1, newv2] = collide(b1, totalb);

      nextv[i][0] += newv1[0];
      nextv[i][1] += newv1[1];
      updated[i]++;
    }

    let v = updated[i] ? nextv[i] : b1.v;

    if (b1.p[0] - b1.r <= 0 && v[0] < 0 || b1.p[0] + b1.r >= w && v[0] > 0) {
      if (updated[i]) {
        nextv[i][0] = -nextv[i][0];
      } else {
        nextv[i][0] = -b1.v[0];
        nextv[i][1] = b1.v[1];
        updated[i]++;
      }
    }
    if (b1.p[1] - b1.r <= 0 && v[1] < 0 || b1.p[1] + b1.r >= h && v[1] > 0) {
      if (updated[i]) {
        nextv[i][1] = -nextv[i][1];
      } else {
        nextv[i][0] = b1.v[0];
        nextv[i][1] = -b1.v[1];
        updated[i]++;
      }
    }
  }

  for (let i = 0; i < nextv.length; i++) {
    if (updated[i]) balls[i].v = nextv[i];
    // if (updated[i] > 1) paused = true;
  }

  collideChecksMetrics.update(checks);
}

/**
 * @param {Ball[]} balls 
 * @param {Tree} tree
 * @param {number} w
 * @param {number} h
 */
export function collider3(balls, tree, w, h) {
  let checks = 0;
  let updated = balls.map(b => 0);
  let nextv = balls.map(b => [0, 0]);

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];

    const otherb = tree.find(b1.p, b1.r);

    for (let b2 of otherb) {
      if (b2 === b1) continue;

      checks++;
      if (touching(b1, b2)) {
        const v2 = V.subtract(b2.v, b1.v);
        const d = V.subtract(b1.p, b2.p);
        if (V.project(v2, d) > 0) {
          const [newv1, newv2] = collide(b1, b2);
          nextv[i][0] += newv1[0];
          nextv[i][1] += newv1[1];
          updated[i]++;
        }
      }
    }

    let v = updated[i] ? nextv[i] : b1.v;

    if (b1.p[0] - b1.r <= 0 && v[0] < 0 || b1.p[0] + b1.r >= w && v[0] > 0) {
      if (updated[i]) {
        nextv[i][0] = -nextv[i][0];
      } else {
        nextv[i][0] = -b1.v[0];
        nextv[i][1] = b1.v[1];
        updated[i]++;
      }
    }
    if (b1.p[1] - b1.r <= 0 && v[1] < 0 || b1.p[1] + b1.r >= h && v[1] > 0) {
      if (updated[i]) {
        nextv[i][1] = -nextv[i][1];
      } else {
        nextv[i][0] = b1.v[0];
        nextv[i][1] = -b1.v[1];
        updated[i]++;
      }
    }
  }
  
  for (let i = 0; i < nextv.length; i++) {
    if (updated[i]) balls[i].v = nextv[i];
    // if (updated[i] > 1) paused = true;
  }

  collideChecksMetrics.update(checks);
}
