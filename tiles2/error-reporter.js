(function () {
  var inside = false;

  window.onerror = function (message, source, lineno, colno, error) {
    if (inside) return false;

    if (source.startsWith("http://localhost")) return false;
    
    if (source == "" || source.startsWith("https://maker.ifttt.com")) return true;    

    inside = true
    
    try {
      var env = [];
      env.push(localStorage["uid"]);
      env.push(navigator.userAgent);
      env.push(navigator.language || navigator.userLanguage || navigator.browserLanguage || navigator.systemLanguage || '');
      env.push(navigator.platform || '');

      sendError(JSON.stringify({
        message: message.toString(),
        source: source.toString(),
        lineno: lineno,
        colno: colno,
        stack: error ? error.stack : [],
        env: env
      }));
      // console.log(message.toString(), source.toString(), lineno, colno, error.toString(), error.stack.toString(), env.toString());
    } catch (e) {
      console.error(e);
    } finally {
      inside = false;
    }

    return true;
  };

  function sendError(text) {
    var s = document.createElement("script");
    s.type = "";
    s.src = "https://maker.ifttt.com/trigger/tilesman-error/with/key/dhe96or_TBtNNNgY9NzE_a?value1=" + encodeURIComponent(text);
    document.head.appendChild(s);
  }
}) ();