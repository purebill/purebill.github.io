(function () {
  let body = window.document.body;
  let classes = new Set();
  
  window.addEventListener("keydown", (event) => {
    let className = "keyboard-" + event.keyCode + "-pressed";
    body.classList.add(className);
    classes.add(className);
  });
  
  window.addEventListener("keyup", (event) => {
    let className = "keyboard-" + event.keyCode + "-pressed";
    body.classList.remove(className);
    classes.delete(className);
  });

  window.addEventListener("blur", (event) => {
    classes.forEach(className => body.classList.remove(className));
    classes.clear();
  });
}) ();