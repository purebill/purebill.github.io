GamePlugins.register(Detector, [TelemetryCollector], (game, telemetry) => {
  let detector = new Detector(telemetry.capacity);

  Timer.periodic(() => detector.detect(telemetry), T.detectorIntervalMs);

  return detector;
});