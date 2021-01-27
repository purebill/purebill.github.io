const Progress = (function () {

  const div = document.getElementById("progress");
  let timerId = null;
  let totalAmount = 0;
  let doneAmount = 0;

  function start(amount) {
    if (timerId != null) return add(amount);

    totalAmount = amount;
    doneAmount = 0;

    timerId = window.setInterval(() => {
      const percent = totalAmount > 0 ? Math.round(doneAmount / totalAmount * 100) : 0;
      div.style.display = "block";
      div.innerText = Math.min(100, percent).toFixed(0) + "%";
    }, 500);
  }

  function add(amount) {
    if (timerId == null) return start(amount);

    totalAmount += amount;
  }

  function done(amount) {
    if (timerId == null) start(amount);

    doneAmount += amount;
  }

  function stop() {
    if (timerId == null) return;

    window.clearInterval(timerId);
    timerId = null;
    div.style.display = "none";
  }

  return {
    start,
    done,
    add,
    stop
  }
})();

export default Progress;