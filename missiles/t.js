/**
 * @param {any} id 
 * @param {any[]} args
 */
function t(id, ...args) {
  if (id instanceof Array) {
    id = id.join("{}");
    let translation = T[id] || id;
    return translation.split("{}").map((part, idx, a) => part + (a.length - 1 == idx ? "" : args[idx])).join("");
  }
  return T[id] || id;
}

const T = {
  booster: "🚀",
  boosterColor: "black",
  score: "★",
  scoreColor: "green",
  time: "🕐",
  timeColor: "black",
  fakeTarget: "☔",
  fakeTargetColor: "black",
  fakeTargetStartColor: [255, 0, 0],
  fakeTargetEndColor: [255, 200, 200],
  life: "❤",
  lifeColor: "#ff471a",
  planeColor: "black",
  planeBoosterColor: "#ff3333",
  planeBoosterAlpha: 0.5,
  planeStartPos: [0, 0],
  planeFakeTargetRadiusColor: "#cccccc",
  trailStartColor: [255, 255, 255],
  trailEndColor: [200, 200, 200],
  missileDieStartColor: [0, 0, 0],
  missileDieEndColor: [255, 255, 255],
  explosionStartColor: [255, 0, 0],
  explosionEndColor: [255, 200, 200],
  explosionAlpha: 0.5,
  obstacleFillColor: "#cccccc",
  obstacleStrokeColor: "#333333",
  skyColor: "#f0ffff",
  skyOutOfRangeColor: "#fff0f0",
  cloudColor: "#eeeeee",
  radarFillColor: "#fff2e6",
  radarStrokeColor: "#663300",
  radarSectorColor: "#ffcc99",
  radarVisibilityAreaColor: "#999999",
  radarPlaneColor: "#663300",
  radarMissileColor: "#ff0000",
  radarPerkColor: "#000000",
  radarAlpha: 0.9,
  radarSize: 100,
  radarScale: 20,
  infoFontSize: 15,
  infoBgColor: "#ffff88",
  infoColor: "#000000",
  infoAlpha: 0.8,
  telemetrySamplesPerSecond: 5,
  telemetryWindowSeconds: 10,
  detectorIntervalMs: 300
};

function rgb(r, g, b) {
  if (arguments.length == 1) {
    return `rgb(${r[0]}, ${r[1]}, ${r[2]})`;
  } else {
    return `rgb(${r}, ${g}, ${b})`;
  }
}