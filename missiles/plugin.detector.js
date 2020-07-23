import GamePlugins from './plugins.js'
import {Detector} from './detector.js'
import {TelemetryCollector} from './telemetry.js'
import Timer from './timer.js';

GamePlugins.register(Detector, [TelemetryCollector], (game, telemetry) => {
  let detector = new Detector(telemetry.capacity);

  // Timer.periodic(() => detector.detect(telemetry), T.detectorIntervalMs);

  game.addTrigger(dt => detector.step(telemetry));

  return detector;
});