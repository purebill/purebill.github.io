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

Keys.key("F2", "Build menu", () => {
  let el = document.getElementById("buildMenu");
  el.style.display = el.style.display == "block" ? "none" : "block";
});

Keys.key("Space", "Pause ON/OFF", () => {
  Timer.paused() ? Timer.resume() : Timer.pause();
  Loop.paused() ? Loop.resume() : Loop.pause();
});

Keys.key("Escape", "Reset current action", () => {
  state.resetState();
});

Keys.mouseMove("Move mouse to select a cell", (e) => {
  let cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  if (state.currentCell === cell) return;
  state.currentCell = cell;

  board.clearSelection();

  board.select(cell);
  
  //cell.neighbours().forEach(it => board.select(it));

  if (state.state == STATE_BUILD_TRANSPORTER || state.state == STATE_CONNECT_TO_POWER) {
    PathFinder.find(PathFinder.nearestCell(state.from.hexaCells, cell), cell)
      .forEach(it => board.select(it));
  }
});

Keys.mouse(0, "Click to build", null, (e) => {
  const cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  state.click(cell);
});

Keys.mouse(1, "Middle click to remove", null, (e) => {
  const cell = board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;
  
  cell.things.forEach(state.deleteThing);
});

Keys.mouse(2, "Right click to build", (e) => {
  let el = document.getElementById("buildMenu");
  el.onclick = () => el.style.display = "none";

  el.style.left = e.clientX + "px";
  el.style.top = e.clientY + "px";
  el.style.display = "block";
});