/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

Keys.init(canvas);

/** @type {HTMLCanvasElement} */
const frameCanvas = document.createElement("canvas");
const frameCtx = frameCanvas.getContext("2d");

window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = "fixed";
  canvas.style.left = '0';
  canvas.style.top = '0';
  
  frameCanvas.width = canvas.width;
  frameCanvas.height = canvas.height;
};
window.onresize(null);

let userId = null;
/**@type {Server} */
let server = null;
/**@type {Game} */
let game = null;
let firstTime = true;

message(t`Initializing...`);
connect();

function connect() {
  Firebase.load("/games/130110c8-4488-4e84-b2bb-2f039c67bc8a/")
      .then(connectToServer);
}

function connectToServer({wsHost, wsPort}) {
  let closeMessage = message(t`Connecting...`);

  if (firstTime) {
    server = new Server(`ws://${wsHost}:${wsPort}/`);

    // s.onError(() => {
    //   wsPort = wsPort == 8080 ? 8081 : 8080;
    //   console.log("[SERVER]", "Reconecting to", wsPort);
    //   s.conntectToOtherUrl(`ws://${wsHost}:${wsPort}/`);
    // });

    server.on("AUTH", userInfo => {
      userId = userInfo.id;
      server.send("GAME_REQ", {id: userId});
    });
    server.on("GAME", gameSetup => {
      console.log("[SERVER]", "Joined as", gameSetup.master ? "master" : "slave");
      closeMessage();
      setupGame(gameSetup);
    });
    server.on("MASTER", ({id, master}) => {
      if (master) {
        if (id == userId) {
          console.log("[SERVER]", "Master status changed to ON");
          game.masterGameNode = true;
        } else {
          console.log("[SERVER]", "Master status changed to OFF");
          game.masterGameNode = false;
        }
      }
    });
    server.on("CLOSE", ({id}) => {
      console.log("[SERVER]", "disconnected", id);
      let plane = game.fliesById.get(id);
      if (plane && game.plane != plane) {
        plane.dead = true;
      }
    });
    server.on("OPEN", ({id}) => {
      console.log("[SERVER]", "connected", id);
    });
    let lastT = 0;
    server.on("POS", state => {
      if (game === null) return;
      if (state.userId == userId) return;

      if (state.t < lastT) return;
      lastT = state.t;

      Serialization.resetLinks();

      for (let entity of state.entities) {
        let e = game.fliesById.get(entity.data.id);
        if (e === undefined) {
          e = Serialization.unserialize(entity);
          // if (e instanceof Plane) e.addInfo("userId", t`enemy`);
          if (e instanceof Plane) e.addInfo("userId", e.id);
          game.addEntity(e);
        } else {
          Serialization.unserializeExisting(e, entity);
        }
      }

      Serialization.resolveLinks(game.fliesById);
    });
  }

  server.setWsUrl(`ws://${wsHost}:${wsPort}/` + (userId ? userId : ""));
  server.connect();

  function setupGame(gameSetup) {
    Math.seedrandom(gameSetup.seed);

    if (firstTime) {
      game = new Game(frameCtx, false, userId);

      game.frameCallback = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(frameCanvas, 0, 0);
      };
    }

    game.masterGameNode = gameSetup.master;
    game.newGameCallback = () => connect();
    game.gameOverCallback = () => server.disconnect();

    setupServerCommunication();
    game.startFromTheBeginning();
    firstTime = false;
  }

  function setupServerCommunication() {
    if (!firstTime) return;
  
    GamePlugins.register(Server, [], game => {
      game.addTrigger(() => {
        if (!server.connected) return;
  
        let entities;
        if (game.masterGameNode) {
          entities = game.flies
              .filter(it => !(it instanceof Plane) || it === game.plane || it.dead)
              .filter(it => it instanceof Explosion || it instanceof Plane || it instanceof Missile || it instanceof Perk)
              .map(it => Serialization.serialize(it));
        } else {
          entities = [Serialization.serialize(game.plane)];
        }
        server.send("POS", {userId, entities});
      });
  
      return server;
    });
  }
}


