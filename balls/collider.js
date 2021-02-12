import {Ball, collide} from "./ball.js";
import Metrics from "./metrics.js";
import { Tree } from "./tree.js";
import V from "./vector.js";

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
  let balls2 = balls.map(b => [0, 0]);

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
          balls2[i][0] += newv1[0];
          balls2[i][1] += newv1[1];
          balls2[j][0] += newv2[0];
          balls2[j][1] += newv2[1];
          updated[i]++;
          updated[j]++;
        }
      }
    }

    let v = updated[i] ? balls2[i] : b1.v;

    if (b1.p[0] - b1.r <= 0 && v[0] < 0 || b1.p[0] + b1.r >= w && v[0] > 0) {
      if (updated[i]) {
        balls2[i][0] = -balls2[i][0];
      } else {
        balls2[i][0] = -b1.v[0];
        balls2[i][1] = b1.v[1];
        updated[i]++;
      }
    }
    if (b1.p[1] - b1.r <= 0 && v[1] < 0 || b1.p[1] + b1.r >= h && v[1] > 0) {
      if (updated[i]) {
        balls2[i][1] = -balls2[i][1];
      } else {
        balls2[i][0] = b1.v[0];
        balls2[i][1] = -b1.v[1];
        updated[i]++;
      }
    }
  }
  
  for (let i = 0; i < balls2.length; i++) {
    if (updated[i]) balls[i].v = balls2[i];
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
export function collider2(balls, tree, w, h) {
  let checks = 0;
  let updated = balls.map(b => 0);
  let balls2 = balls.map(b => [0, 0]);

  for (let i = 0; i < balls.length; i++) {
    const b1 = balls[i];

    const otherb = new Set();
    tree.find(b1.p).forEach(b => otherb.add(b));
    const size = b1.r*2;
    tree.find([b1.p[0] - size, b1.p[1] - size]).forEach(b => otherb.add(b));
    tree.find([b1.p[0] - size, b1.p[1] + size]).forEach(b => otherb.add(b));
    tree.find([b1.p[0] + size, b1.p[1] - size]).forEach(b => otherb.add(b));
    tree.find([b1.p[0] + size, b1.p[1] + size]).forEach(b => otherb.add(b));

    for (let b2 of otherb) {
      if (b2 === b1) continue;

      checks++;
      if (V.dist(b1.p, b2.p) <= b1.r + b2.r) {
        const v2 = V.subtract(b2.v, b1.v);
        const d = V.subtract(b1.p, b2.p);
        if (V.project(v2, d) > 0) {
          const [newv1, newv2] = collide(b1, b2);
          balls2[i][0] += newv1[0];
          balls2[i][1] += newv1[1];
          updated[i]++;
        }
      }
    }

    let v = updated[i] ? balls2[i] : b1.v;

    if (b1.p[0] - b1.r <= 0 && v[0] < 0 || b1.p[0] + b1.r >= w && v[0] > 0) {
      if (updated[i]) {
        balls2[i][0] = -balls2[i][0];
      } else {
        balls2[i][0] = -b1.v[0];
        balls2[i][1] = b1.v[1];
        updated[i]++;
      }
    }
    if (b1.p[1] - b1.r <= 0 && v[1] < 0 || b1.p[1] + b1.r >= h && v[1] > 0) {
      if (updated[i]) {
        balls2[i][1] = -balls2[i][1];
      } else {
        balls2[i][0] = b1.v[0];
        balls2[i][1] = -b1.v[1];
        updated[i]++;
      }
    }
  }
  
  for (let i = 0; i < balls2.length; i++) {
    if (updated[i]) balls[i].v = balls2[i];
    // if (updated[i] > 1) paused = true;
  }

  collideChecksMetrics.update(checks);
}
