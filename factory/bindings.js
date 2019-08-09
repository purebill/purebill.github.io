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
  Timer.paused() ? Timer.resume() : Timer.pause();
  Loop.paused() ? Loop.resume() : Loop.pause();
});