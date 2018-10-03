var WORKERS = navigator.hardwareConcurrency || 4;
var workers = [];
for (var i = 0; i < WORKERS; i++) {
  workers.push(new Workerp("worker.js"));
}

var currentWorker = 0;
function worker() {
  return workers[currentWorker++ % workers.length];
}

let results = $("results");
function print(s) {
  let line = document.createElement("p");
  line.innerText = s;
  results.appendChild(line);
}

let pollerId;

function findExpr2(digits, EXPECTED, OPS) {
  let found = new Map();
  let foundIdx = 1;
  let runningWorkers = 0;
  let startTimeMs = new Date().getTime();
  results.innerHTML = "";
  document.body.classList.add("running");

  trySpaces(digits, new Map());
  pollerId = setInterval(() => {
    if (runningWorkers == 0) {
      clearInterval(pollerId);
      document.body.classList.remove("running");
      print("Done in " + (new Date().getTime() - startTimeMs) / 1000.0 + "s");
      $("run").disabled = false;
      $("stop").disabled = true;
    }
  }, 500);

  function trySpaces(digits, spaces) {
    runningWorkers++;
    worker()
      .call({
        numbers: toNumbers(digits, spaces),
        EXPECTED,
        OPS 
      })
      .then(result => {
        runningWorkers--;
        result.forEach(it => {
          if (!found.has(it)) {
            found.set(it, foundIdx);
            print(foundIdx + ". " + it + " = " + EXPECTED);
            foundIdx++;
          }
        });
      });
    
    for (let i = 1; i < digits.length; i++) {
      if (!spaces.has(i)) {
        spaces.set(i, true);
        trySpaces(digits, spaces);
        spaces.delete(i);
      }
    }
  }

  function toNumbers(digits, spaces) {
    let expr = "";
    for (let i = 0; i < digits.length; i++) {
      if (spaces.has(i)) expr += ' ';
      expr += digits[i];
    }
    
    let numbers = expr.split(' ').map(function (it) {return parseInt(it); });
    return numbers;
  }
}

function $(id) {
  if (typeof id === "string") {
    return document.getElementById(id);
  }

  if (typeof id === "function") {
    return window.addEventListener("load", id);
  }
  
  if (id instanceof HTMLCollection) {
    var a = [];
    for (var i = 0; i < id.length; i++) a.push(id[i]);
    return a;
  }

  return id;
}

$("stop").disabled = true;
$("run").onclick = () => {
  let digits = $("digits").value.trim().split(/\s+/).map(it => parseInt(it));
  let value = parseInt($("expected").value.trim());
  let ops = $("ops").value.trim().split(/\s+/);
  findExpr2(digits, value, ops);
  $("stop").disabled = false;
  $("run").disabled = true;
};
$("stop").onclick = () => {
  workers.forEach(it => it.reset());
  $("stop").disabled = true;
  $("run").disabled = false;
  clearInterval(pollerId);
  document.body.classList.remove("running");
};