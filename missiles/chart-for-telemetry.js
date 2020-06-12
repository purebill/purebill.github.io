GamePlugins.register(game => {
  const chartCanvas = document.createElement("canvas");
  chartCanvas.width = 300;
  chartCanvas.height = 300;
  Timer.periodic(() => chartFor(game.telemetry, chartCanvas), 1000);
  game.addOverlay({
    drawPre: ctx => true,
    drawPost: ctx => ctx.drawImage(chartCanvas, 20, 200)
  });
});

/**
 * @param {TelemetryCollector} telemetry 
 */
function chartFor(telemetry, chartCanvas) {
  const chart = new Chart();
  if (telemetry.planeState.size > 0) {
    let dists = new Array(telemetry.planeState.size);
    let angles = new Array(telemetry.planeState.size);
    telemetry.planeState.forEach((p, i) => {
      const m = telemetry.missileState.get(i);
      const dist = V.length(V.subtract(p.xy, m.xy));
      const angle = V.angle(p.v, m.v);

      dists[i] = [p.t, dist];
      angles[i] = [p.t, angle];
    });

    angles = smooth(angles, 2);

    const trigger = new Array(telemetry.planeState.size);
    telemetry.planeState.forEach((p, i) => {
      const m = telemetry.missileState.get(i);

      const dist = dists[i][1];
      const sameDir = Math.sign(V.dotProduct(p.v, m.v)) >= 0;
      const behind = V.behind(m.v, m.xy, p.xy);

      trigger[i] = [p.t, sameDir && dist < 100 && behind ? 1 : 0];
    });

    chart.add(dists, {color: "green", showValues: true});
    chart.add(angles, {color: "blue", showValues: true});
    chart.add(trigger, {color: "black", maxy: 1, miny: 0});
  }
  chart.draw(chartCanvas.getContext("2d"));
}

function smooth(data, width) {
  const res = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (i < width || i >= data.length - width) {
      res[i] = data[i];
      continue;
    }
    let s = 0;
    for (let j = i - width; j < i + width; j++) {
      s += data[j][1];
    }
    res[i] = [data[i][0], s/(2*width + 1)];
  }
  return res;
}
