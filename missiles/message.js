/**
 * @param {string} text 
 * @param {(() => void)=} callback
 * @returns {() => void}
 */
function message(text, callback) {
  let snapshot;

  if (callback) {
    snapshot = Keys.snapshot();
    Keys.resetToRoot();
    Keys.key("Space", [], t`Hide the message`, () => _pop());
    Keys.key("Escape", [], t`Hide the message`, () => _pop());
    Keys.key("Enter", [], t`Hide the message`, () => _pop());
  }

  let root = document.getElementById("message");
  root.innerHTML = "";
  let div = document.createElement("div");
  div.innerText = text;
  root.appendChild(div);

  root.style.display = "block";

  div.onclick = () => _pop();

  function _pop() {
    document.getElementById("message").style.display = "none";
    if (snapshot !== undefined) Keys.restoreFromSnapshot(snapshot);
    callback && callback();
  }

  return _pop;
}
