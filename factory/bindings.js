Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
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

Keys.key("Space", [], "Pause ON/OFF", () => Loop.paused() ? Loop.resume() : Loop.pause());

let currentCell = null;
Keys.mouseMove("Move mouse to select a cell", (e) => {
  let cell = state.board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  if (currentCell === cell) return;
  currentCell = cell;

  state.board.clearSelection();
  state.board.select(cell);

  state.behaviour.mouseMove(cell, e);
});

Keys.mouseLeave("Stop scrolling on mouse leave", (e) => {
  state.behaviour.mouseLeave();
});

Keys.mouse(0, [], "Click to build", null, (e) => {
  const cell = state.board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  state.behaviour.click(cell);
});

Keys.mouse(0, ["Win"], "Click to debug", null, (e) => {
  const cell = state.board.fromCoords(e.clientX, e.clientY);
  console.log(cell.things);
});

Keys.mouse(2, [], "Right click to show a context menu", (e) => {
  const cell = state.board.fromCoords(e.clientX, e.clientY);
  if (cell === null) return;

  state.behaviour.rightClick(cell);
});