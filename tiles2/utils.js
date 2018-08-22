function $(id) {
  if (typeof id === "string") {
    return document.getElementById(id);
  }
  
  if (id instanceof HTMLCollection) {
    var a = [];
    for (var i = 0; i < id.length; i++) a.push(id[i]);
    return a;
  }

  return id;
}

function addClass(e, className) {
  var classes = e.className.trim().split(/\s+/).filter(function (it) { return it != className; });
  classes.push(className);
  e.className = classes.join(" ");
}

function removeClass(e, className) {
  e.className = e.className.trim().split(/\s+/).filter(function (it) { return it != className; }).join(" ");
}
