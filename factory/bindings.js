Keys.key("F1", "Show this help message (F1 again to hide)", () => {
  let el = document.getElementById("help");

  if (el.style.display == "block") {
    el.style.display = "none";
    return;
  }

  let help = Keys.help();
  el.innerHTML =
    "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
    "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";

  el.style.display = "block";
});

Keys.key("Space", "Pause ON/OFF", () => {
  // Timer.allPaused() ? Timer.resumeAll() : Timer.pauseAll();
  Loop.paused() ? Loop.resume() : Loop.pause();
});

Keys.key("Escape", "Reset current action", () => {
  state.reset();
});

Keys.mouseMove("Move mouse to select a cell", (e) => {
  let cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  if (state.currentCell === cell) return;
  state.currentCell = cell;

  board.clearSelection();
  board.select(cell);
  //cell.neighbours().forEach(it => board.select(it));

  state.behaviour.mouseMove(cell);
});

Keys.mouse(0, [], "Click to build", null, (e) => {
  const cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  state.behaviour.click(cell);
});

Keys.mouse(0, ["Win"], "Click to debug", null, (e) => {
  const cell = board.fromCoords(e.clientX, e.clientY);
  console.log(cell.things);
});

Keys.mouse(2, [], "Right click to show a context menu", (e) => {
  const cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  state.behaviour.rightClick(cell);
});