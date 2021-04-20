var saveAs = saveAs || (function(view) {
  "use strict";
  // IE <10 is explicitly unsupported
  if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
    return;
  }
  var
      doc = view.document
      // only get URL when necessary in case Blob.js hasn't overridden it yet
    , get_URL = function() {
      return view.URL || view.webkitURL || view;
    }
    , save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
    , can_use_save_link = "download" in save_link
    , click = function(node) {
      var event = new MouseEvent("click");
      node.dispatchEvent(event);
    }
    , is_safari = /constructor/i.test(view.HTMLElement) || view.safari
    , is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
    , setImmediate = view.setImmediate || view.setTimeout
    , throw_outside = function(ex) {
      setImmediate(function() {
        throw ex;
      }, 0);
    }
    , force_saveable_type = "application/octet-stream"
    // the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
    , arbitrary_revoke_timeout = 1000 * 40 // in ms
    , revoke = function(file) {
      var revoker = function() {
        if (typeof file === "string") { // file is an object URL
          get_URL().revokeObjectURL(file);
        } else { // file is a File
          file.remove();
        }
      };
      setTimeout(revoker, arbitrary_revoke_timeout);
    }
    , dispatch = function(filesaver, event_types, event) {
      event_types = [].concat(event_types);
      var i = event_types.length;
      while (i--) {
        var listener = filesaver["on" + event_types[i]];
        if (typeof listener === "function") {
          try {
            listener.call(filesaver, event || filesaver);
          } catch (ex) {
            throw_outside(ex);
          }
        }
      }
    }
    , auto_bom = function(blob) {
      // prepend BOM for UTF-8 XML and text/* types (including HTML)
      // note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
      if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
        return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
      }
      return blob;
    }
    , FileSaver = function(blob, name, no_auto_bom) {
      if (!no_auto_bom) {
        blob = auto_bom(blob);
      }
      // First try a.download, then web filesystem, then object URLs
      var
          filesaver = this
        , type = blob.type
        , force = type === force_saveable_type
        , object_url
        , dispatch_all = function() {
          dispatch(filesaver, "writestart progress write writeend".split(" "));
        }
        // on any filesys errors revert to saving with object URLs
        , fs_error = function() {
          if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
            // Safari doesn't allow downloading of blob urls
            var reader = new FileReader();
            reader.onloadend = function() {
              var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
              var popup = view.open(url, '_blank');
              if(!popup) view.location.href = url;
              url=undefined; // release reference before dispatching
              filesaver.readyState = filesaver.DONE;
              dispatch_all();
            };
            reader.readAsDataURL(blob);
            filesaver.readyState = filesaver.INIT;
            return;
          }
          // don't create more object URLs than needed
          if (!object_url) {
            object_url = get_URL().createObjectURL(blob);
          }
          if (force) {
            view.location.href = object_url;
          } else {
            var opened = view.open(object_url, "_blank");
            if (!opened) {
              // Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
              view.location.href = object_url;
            }
          }
          filesaver.readyState = filesaver.DONE;
          dispatch_all();
          revoke(object_url);
        }
      ;
      filesaver.readyState = filesaver.INIT;

      if (can_use_save_link) {
        object_url = get_URL().createObjectURL(blob);
        setImmediate(function() {
          save_link.href = object_url;
          save_link.download = name;
          click(save_link);
          dispatch_all();
          revoke(object_url);
          filesaver.readyState = filesaver.DONE;
        }, 0);
        return;
      }

      fs_error();
    }
    , FS_proto = FileSaver.prototype
    , saveAs = function(blob, name, no_auto_bom) {
      return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
    }
  ;

  // IE 10+ (native saveAs)
  if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
    return function(blob, name, no_auto_bom) {
      name = name || blob.name || "download";

      if (!no_auto_bom) {
        blob = auto_bom(blob);
      }
      return navigator.msSaveOrOpenBlob(blob, name);
    };
  }

  // todo: detect chrome extensions & packaged apps
  //save_link.target = "_blank";

  FS_proto.abort = function(){};
  FS_proto.readyState = FS_proto.INIT = 0;
  FS_proto.WRITING = 1;
  FS_proto.DONE = 2;

  FS_proto.error =
  FS_proto.onwritestart =
  FS_proto.onprogress =
  FS_proto.onwrite =
  FS_proto.onabort =
  FS_proto.onerror =
  FS_proto.onwriteend =
    null;

  return saveAs;
}(
     typeof self !== "undefined" && self
  || typeof window !== "undefined" && window
  || this
));

///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////


function toArray(collection) {
  let a = [];
  for (let i = 0; i < collection.length; i++) a[i] = collection[i];
  return a;
}

function toDom(text) {
  let dom = document.createElement('div');
  dom.innerHTML = text;
  // prevent images from loading
  toArray(dom.querySelectorAll("img")).forEach(img => { img.dataset.src = img.src; img.src = ""});
  return dom;
}

var maxPage = 1290;
var data = [];
var batchSize = 10;

doBatch([], 1).then(() => {
  saveAs(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    "amazfitwatchfaces_" + (new Date().getTime()) + ".json");
});

function doBatch(oldPromises, startPage) {
  return new Promise(resolve => {
    Promise.all(oldPromises).then(() => {
      if (startPage <= maxPage) {
        let promises = [];
        for (let p = startPage; p < startPage + batchSize; p++) {
          promises.push(processPage(p, data));
        }
        doBatch(promises, startPage + batchSize).then(resolve);
      } else {
        resolve();
      }
    });
  });
}

/*for (let p = 1; p <= maxPage; p++) {
  promises.push(processPage(p, data));
}

Promise.all(promises).then(it => {
  saveAs(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}), "amazfitwatchfaces_" + (new Date().getTime()) + ".json");
});*/

function delay(f, t) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(f());
    }, t);
  });
}

var maxAttempts = 2;
function http(url, attempt) {
  let retry = (reason) => {
    if (attempt < maxAttempts) {
      return delay(() => http(url), Math.round(500 + Math.random()*1000), attempt+1);
    } else {
      console.error("Retries exhausted for: " + url);
      return Promise.resolve("");
    }
  };

  return fetch(url)
      .then(
          r => {
            if (r.status >= 300) return retry(r.status, 1);
            return r.text();
          },
          error => retry(error, 1)
      );
}

function processPage(p, data) {
  return http('https://amazfitwatchfaces.com/bip/p/' + p)
      .then(t => toDom(t))
      .then(dom => {
        let objs = parseDom(dom);
        objs.forEach(o => data.push(o));
        return Promise.all(objs.map(o => details(o)));
      });
}

function parseDom(dom) {
  return toArray(dom.querySelectorAll("div.col-md-3 div.panel"))
      .map(it => {
        return {
          title: it.title,
          compatibleWith: toArray(it.querySelectorAll("div.wf-comp code")).map(it => it.innerText),
          // https://amazfitwatchfaces.com/bip/view/${id}
          id: it.querySelector("div.panel-body a.wf-act").href.replace(/^.+\/(\d+)$/, "$1"),
          img: it.querySelector("div.panel-body a.wf-act img.wf-img").dataset.src,
          // https://amazfitwatchfaces.com/search/bip/author/${user}
          user: it.querySelector("div.panel-body div.wf-user a").innerText,
          info: {
            stars: parseInt(it.querySelector("div.panel-body div.wf-info i.fa-star + span.text-muted").innerText),
            views: parseInt(it.querySelector("div.panel-body div.wf-info i.fa-eye + span.text-muted").innerText),
            downloads: parseInt(it.querySelector("div.panel-body div.wf-info i.fa-download + span.text-muted").innerText)
          }
        }
      });
}

function details(o) {
  return http("https://amazfitwatchfaces.com/bip/view/" + o.id)
      .then(t => toDom(t))
      .then(dom => {
        let desc = toArray(dom.querySelectorAll("p.mdesc"));
        o.description = desc[0].innerText;
        o.tags = toArray(desc[1].querySelectorAll("a")).map(it => it.innerText);

        // https://amazfitwatchfaces.com/do/dl?dir=bin&file=${fileId}&dt=17&wid=${userId}&d=bip
        o.downloads = toArray(dom.querySelectorAll("div#dwModal a")).map(it => it.innerText);
      });
}