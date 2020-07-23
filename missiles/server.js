export class Server {
  /**
   * @param {string} wsUrl 
   */
  constructor(wsUrl) {
    this._wsUrl = wsUrl;
    
    /**@type {WebSocket} */
    this._ws = null;

    /**@type {Map<string, (object) => void>} */
    this._handlers = new Map();

    /**@type {(() => void)[]} */
    this._errorHandlers = [];

    this.debug = false;
    this.reconnectOnClose = false;

    this.connected = false;
  }

  conntectToOtherUrl(wsUrl) {
    if (this._ws) this.disconnect();
    this._wsUrl = wsUrl;
    this.connect();
  }

  setWsUrl(url) {
    this._wsUrl = url;
  }

  connect() {
    this.disconnect();

    if (this.debug) console.log("[SERVER]", "connecting to", this._wsUrl);

    this._ws = new WebSocket(this._wsUrl);
    this._ws.onmessage = m => this._onMessage(m);
    this._ws.onerror = m => this._onError(m);
    this._ws.onclose = m => this._onClose(m);
    this._ws.onopen = m => this._onOpen(m);

    this.connected = true;
  }

  disconnect() {
    if (this._ws) this._ws.close();
    this._ws = null;
    this.connected = false;
    if (this.debug) console.log("[SERVER]", "disconnected");
  }

  isReady() {
    return this._ws !== null && this._ws.readyState == WebSocket.OPEN;
  }

  send(type, payload) {
    if (this._ws === null) throw new Error("Can't send message. WebSocket is not created");
    if (this._ws.readyState == WebSocket.CLOSED || this._ws.readyState == WebSocket.CLOSING)
      throw new Error("Can't send message. WebSocket is closing or closed");

    if (this._ws.readyState == WebSocket.CONNECTING) {
      // if (this.debug) console.log("[SERVER]", "status: connecting. Delaying the message sending");
      // setTimeout(() => this.send(type, payload), 0);
      return;
    }

    this._ws.send(`${type}|${JSON.stringify(payload)}`);
  }

  /**
   * @param {string} type
   * @param {(payload: object) => void} handler
   */
  on(type, handler) {
    if (this._handlers.has(type)) throw new Error(`Hanlder '${type}' already exists`);
    this._handlers.set(type, handler);
  }

  /**
   * @param {() => void} handler 
   */
  onError(handler) {
    this._errorHandlers.push(handler);
  }

  /**
   * @param {MessageEvent} m 
   */
  _onMessage(m) {
    if (this.debug) console.log("[SERVER]", m);
    let idx = m.data.indexOf("|");
    if (idx == -1) throw new Error(`Message has no type: ${m.data}`);
    
    let type = m.data.substr(0, idx);
    let payload = m.data.substr(idx + 1);

    let handler = this._handlers.get(type);
    if (handler === undefined) throw new Error(`No handler for type '${type}'`);

    handler(JSON.parse(payload));
  }

  _onError(m) {
    console.error("[SERVER]", this._ws.readyState , m);
    this._errorHandlers.forEach(it => it());
  }

  _onClose(m) {
    if (this.debug) console.log("[SERVER]", "closed", m.code, m.reason);

    if (this.reconnectOnClose) this.connect();
  }

  _onOpen(m) {
    if (this.debug) console.log("[SERVER]", "openned", m);
  }
}
