GamePlugins.register(TelemetryCollector, [], game => {
  let samplesCount = T.telemetryWindowSeconds*T.telemetrySamplesPerSecond;
  let telemetry = new TelemetryCollector(1000/T.telemetrySamplesPerSecond, game, samplesCount);
  game.addTrigger(telemetry.toTrigger());
  return telemetry;
});