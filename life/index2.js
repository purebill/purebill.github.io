let AppApi = {};

class App {
  constructor(w, h, board) {
    this.w = w;
    this.h = h;
    this.board = board;
    this.canvas = document.getElementById("result");
    this.canvas.width = window.innerWidth - 10;
    this.canvas.height = window.innerHeight - 10;
    this.ctx = this.canvas.getContext("2d");

    this.grid = true;

    this.mouseDown = false;
    this.drag = false;
    this.dragX = 0;
    this.dragY = 0;

    this.delay = 0;

    this.reset();
    this.onResize();
  }

  reset() {
    this.zoom = 1;
    this.left = 0;
    this.top = 0;

    this.generation = 0;
    this.stopped = true;
    this.draw = false;
    this.mean = 0;
  }

  onResize() {
    this.canvas.width = window.innerWidth - 10;
    this.canvas.height = window.innerHeight - 10;
  }

  run() {
    Files.onFileDropped((name, file) => {
      this.reset();
      this.board.clear().then(() => {
        new LifeFileReader().read(name, file, this.board)
          .then(() => this.center())
          .then(() => this.show())
          .then(this.message("Loaded", 1000));
      });
    });

    window.onresize = () => {
      this.onResize();  
      this.show();
    };
    Keys.init(this.canvas);
    
    Keys.key("F1", [], "Show this help message (F1 again to hide)", () => {
      ActivityManager.append(finihs => {
        const close = () => {
          el.style.display = "none";
          finihs();
        };

        Keys.key("Escape", [], "Close help", close);

        let el = document.getElementById("help");

        if (el.style.display == "block") {
          close();
          return;
        }
  
        let help = Keys.help();
        el.innerHTML =
          "<h2>Keyboard</h2>\n<pre>" + help.keys.join("\n</pre><pre>") + "</pre>" +
          "<h2>Mouse</h2>\n<pre>" + help.mouse.join("\n</pre><pre>") + "</pre>";
  
        el.style.display = "block";
      });
    });
    Keys.push();

    Keys.key("NumpadAdd", [], "Slower", () => {
      if (this.delay == 0) this.delay = 1;
      this.delay = Math.min(1000, this.delay << 1);
      this.message("Delay: " + this.delay);
    });
    Keys.key("NumpadSubtract", [], "Faster", () => {
      this.delay = Math.max(0, this.delay >> 1);
      this.message("Delay: " + this.delay);
    });

    Keys.key("Space", [], "Step", () => {
      this.stopped = true;
      this.board.step()
        .then(() => this.generation++)
        .then(() => this.show());
    });
    Keys.key("Enter", [], "Pause/Resume", () => {
      this.stopped = !this.stopped;
      if (this.stopped) this.show();
      this.cycle();
    });
    Keys.mouseZoom([], "Zoom in/out", e => {
      const x = Math.floor(e.offsetX / this.zoom + this.left);
      const y = Math.floor(e.offsetY / this.zoom + this.top);

      this.zoom = this.zoom * (e.deltaY > 0 ? 0.5 : 2);
      if (this.zoom < 1) this.zoom = 1;

      this.left += x - Math.floor(e.offsetX / this.zoom + this.left);
      this.top  += y - Math.floor(e.offsetY / this.zoom + this.top);

      this.show();
    });
    Keys.mouse(0, [], "Set/reset a dot",
      e => {
        this.mouseDown = false;
        if (this.drag) {
          this.drag = false;
        } else {
          const x = Math.floor(e.offsetX / this.zoom + this.left);
          const y = Math.floor(e.offsetY / this.zoom + this.top);
          this.switchCell(x, y);
        }
      },
      e => {
        this.mouseDown = true;
        this.dragX = e.offsetX;
        this.dragY = e.offsetY;
        this.dragLeft = this.left;
        this.dragTop  = this.top;
      });
    Keys.mouseMove([], "Drag to pan", e => {
      const x = Math.floor(e.offsetX / this.zoom + this.left);
      const y = Math.floor(e.offsetY / this.zoom + this.top);
      document.getElementById("statusbar").innerHTML = x + " : " + y;

      if (!this.drag && this.mouseDown) {
        if (Math.abs(e.offsetX - this.dragX)/this.zoom > 1
          || Math.abs(e.offsetY - this.dragY)/this.zoom > 1) {
            this.drag = true;
          }
      }

      if (this.drag) {
        this.left = Math.floor(this.dragLeft - (e.offsetX - this.dragX) / this.zoom);
        this.top  = Math.floor(this.dragTop  - (e.offsetY - this.dragY) / this.zoom);
        this.show();
      }
    });
    Keys.key("KeyR", [], "Run script", () => {
      ActivityManager.replace(finish => {
        const formDiv = document.getElementById("script-form");

        const close = () => {
          formDiv.style.display = "none";
          finish();
        };

        Keys.key("Escape", [], "Cancel", close);
        document.getElementById("script-form-cancel").onclick = close;
        document.getElementById("script-form-run").onclick = () => {
          const js = document.getElementById("script-form-script").value;
          eval(js);
          close();
        };
        document.getElementById("script-form-save").onclick = () => {
          const name = window.prompt("Name");
          if (name) {
            const serialized = Serialization.serialize(document.getElementById("script-form-script").value);

            close();
            this.save(name, serialized);
          }
        };
        formDiv.style.display = "block";
        document.getElementById("script-form-script").focus();
      });
    }); 
    Keys.key("KeyC", [], "Clear", () => {
      this.clear();
    });
    Keys.key("KeyG", [], "Grid show/hide", () => {
      this.grid = !this.grid;
      this.show();
    });
    Keys.key("KeyS", [], "Save", () => {
      this.board.getProxyTarget()
        .then(board => {
          const name = window.prompt("Name");
          if (name) {
            const serialized = Serialization.serialize(board);

            this.save(name, serialized);
          }
        });
    });
    Keys.key("KeyL", [], "Load", () => {
      ActivityManager.replace(finish => {
        const containerDiv = document.getElementById("menuContainer");

        const close = () => {
          containerDiv.style.display = "none";
          finish();
        };

        let remoteNamesSet;
  
        const select = name => {
          close();
          if (remoteNamesSet.has(name)) {
            Firebase.load(name)
              .then(json => Serialization.unserialize(json))
              .then(o => this.load(o));
          } else {
            Promise.resolve(Persister.load(name))
              .then(json => Serialization.unserialize(json))
              .then(o => this.load(o));
          }
        };
  
        Keys.key("Escape", [], "Close menu", close);
  
        const localNames = Persister.names();

        Firebase.loadKeys().then(remoteNames => {
          remoteNamesSet = new Set(remoteNames);
          
          const mergedNamesSet = new Set(remoteNames);
          localNames.forEach(it => mergedNamesSet.add(it));

          const names = new Array(...mergedNamesSet.values());

          let last = Math.min(9, names.length);
          for (let idx = 1; idx <= last; idx++) {
            Keys.key("Digit" + idx, [], "Select " + idx, () => select(names[idx - 1]));
          }
    
          const div = document.getElementById("menu");
          div.innerHTML = "";
          let i = 1;
          names.forEach(name => {
            const span = document.createElement("div");
            span.innerHTML = (i < 10 ? i++ + ". " : "") + name + (remoteNamesSet.has(name) ? "" : " [L]");
            span.onclick = () => {
              select(name);
            };
            div.appendChild(span);
          });
          containerDiv.style.display = "block";
        });
      });
    });
  
    setInterval(() => {
      this.draw = true;
    }, 100);

    setInterval(() => {
      const info = document.getElementById("info");
      info.innerHTML = 
          "<p>Generation: " + this.generation + "</p>" +
          "<p>Speed: " + Math.round(1000 / this.mean) + " generations/sec";
    }, 500);


    const showOnce = (direct) => {
      if (showOnce._timerId) clearTimeout(showOnce._timerId);
      
      if (direct) {
        this.show();
        return;
      }

      showOnce._timerId = setTimeout(() => showOnce(true), 300);
    };

    AppApi.clear = () => this.clear();
    AppApi.switchCell = (x, y) => {
      this.board.get(x, y)
            .then(v => this.board.set(x, y, 1 - v))
            .then(showOnce);
    };
    AppApi.setCell = (x, y) => {
      this.board.set(x, y, 1).then(showOnce);
    };
    AppApi.clearCell = (x, y) => {
      this.board.set(x, y, 0).then(showOnce);
    };

    this.board.put(Math.round(this.w / 2), Math.round(this.h / 2),
    [
      [0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 0, 0],
      [1, 1, 0, 0, 1, 1, 1],
    ])
    .then(() => this.show());
  }

  save(name, serialized) {
    // save locally
    Persister.save(name, serialized);

    // save to Firebase
    Firebase.save(name, serialized)
      .then(() => this.message("Saved"));
  }

  center() {
    return this.board.boundingBox().then(box => {
      console.log(box);
      const w = Math.floor(this.canvas.width / this.zoom / 2);
      const h = Math.floor(this.canvas.height / this.zoom / 2);

      this.left = -w + Math.round((box.right - box.left) / 2);
      this.top  = -h + Math.round((box.bottom - box.top) / 2);
      console.log(this.left, this.top);
      this.show();
    })
  }

  load(o) {
    new Promise(resolve => {
      if (o instanceof Board2) this.board.setProxyTarget(o).then(resolve);
      else {
        eval(o);
        this.center()
        .then(resolve);
      }
    })
    .then(() => {
      this.reset();
      this.center()
      .then(() => this.show());
    });
  }

  clear () {
    this.board.clear()
        .then(() => {
          this.reset();
          this.show();
        });
  }

  switchCell(x, y) {
    this.board.get(x, y)
          .then(v => this.board.set(x, y, 1 - v))
          .then(() => this.show());
  }

  message(text, delay) {
    Message.show(text);
    if (Message._timerId) clearTimeout(Message._timerId);
    Message._timerId = window.setTimeout(() => {
      Message.hide();
      Message._timerId = null;
    }, delay || 3000);
  }

  show() {
    const ww = Math.round(this.canvas.width / this.zoom);
    const hh = Math.round(this.canvas.height / this.zoom);
    return this.board.toImageData(this.left, this.top, ww, hh, this.zoom).then(imageData => {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          this.ctx.putImageData(imageData, 0, 0);

          if (this.grid && this.zoom > 10) {
            this.ctx.save();
            this.ctx.fillStyle = "#999999";
            for (let x = 0; x < ww; x++) {
              for (let y = 0; y < hh; y++) {
                this.ctx.beginPath();
                this.ctx.arc(x*this.zoom, y*this.zoom, 1, 0, 2*Math.PI);
                this.ctx.fill();
              }
            }
            this.ctx.restore();
          }

          resolve();
        });
      })
    });
  }

  cycle(direct, start) {
    if (this.stopped) return;

    if (!direct && this.delay > 0) {
      start = new Date().getTime();
      setTimeout(() => this.cycle(true, start), this.delay);
      return;
    }

    if (!direct) start = new Date().getTime();
  
    this.board.step()
      .then(() => {
        this.generation++;
        const end = new Date().getTime();
        this.mean = (this.mean + (end - start)) / 2;
        if (this.draw) {
          return this.show().then(() => this.draw = false);
        }
      })
      .then(() => this.cycle());
  }
}

const width = 1000;
const height = 1000;
RemoteProxy.of(new Board2(width, height), ["sparse-matrix.js", "board2.js"])
  .then(proxy => new App(width, height, proxy).run());
