function random(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + Math.round(Math.random() * (max - min));
}

function randomElement(a) {
  return a[random(a.length - 1)];
}

class UnauthorizedException extends Error {
  constructor(message) {
    super(message);
  }
}

class ConflictException extends Error {
  constructor(message) {
    super(message);
  }
}

class Dropbox {
  /**
   * @param {DropboxAuth} auth 
   */
  constructor(auth) {
    this._auth = auth;
  }

  /**
   * @param {string} path 
   * @returns {Promise<any>}
   */
  list(path) {
    return this._withToken(token => fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        path,
        recursive: false,
        include_deleted: false,
        include_has_explicit_shared_members: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false
      }),
      mode: "cors"
    }))
      .then(({entries, cursor, has_more}) => {
        if (!has_more) return entries;

        return this._listTheRest(cursor)
          .then((allOtherEntries) => {
            allOtherEntries.forEach(e => entries.push(e));
            return entries;
          });
      })
      .then(entries => entries.map(e => e.name));
  }

  _listTheRest(cursor) {
    let allEntries = [];

    const request = (cursor, resolve) => this._withToken(token => fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cursor
      }),
      mode: "cors"
    }))
      .then(({entries, cursor, has_more}) => {
        entries.forEach(e => allEntries.push(e));
        if (!has_more) {
          resolve(allEntries);
          return;
        }
        request(cursor, resolve);
      });

    return new Promise(resolve => request(cursor, resolve));
  }

  /**
   * @param {string} path 
   * @returns {Promise<string>}
   */
  download(path) {
    return this._withToken(token => fetch("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": http_header_safe_json({
          path
        }),
        "Authorization": `Bearer ${token}`
      },
      mode: "cors"
    }), response => response.text());
  }

  /**
   * @param {string} path 
   * @param {string} content 
   * @returns {Promise<void>}
   */
  upload(path, content) {
    // let buffer = new ArrayBuffer(content.length * 2);
    // let int16View = new Int16Array(buffer);
    // for (let i = 0; i < content.length; i++) int16View[i] = content.charCodeAt(i);

    return this._withToken(token => fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": http_header_safe_json({
          path,
          mode: "add",
          autorename: false,
          mute: true, 
          strict_conflict: true
        }),
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/octet-stream"
      },
      body: content,
      mode: "cors"
    }));
  }

  /**
   * @param {(token: string) => Promise<any>} f 
   * @param {((request: Response) => Promise)=} bodyExtractor
   * @param {boolean=} noTokenRefresh
   */
  _withToken(f, bodyExtractor, noTokenRefresh) {
    bodyExtractor = bodyExtractor || (response => response.json());

    return this._auth.token()
      .then(f)
      .then(response => {
        if (response.ok) return bodyExtractor(response);
        
        if (response.status == 401) {
          if (noTokenRefresh) throw new UnauthorizedException("Token refresh failed");

          return this._auth.token(true).then(() => this._withToken(f, bodyExtractor, true));
        } else if (response.status == 409) {
          throw new ConflictException("Conflict");
        }

        return Promise.reject("HTTP status: " + response.status);
      });
  }
}

const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~".split("");

class DropboxAuth {
  /**
   * @param {string} clientId 
   * @param {string=} redirectUri 
   */
  constructor(clientId, redirectUri) {
    this._clientId = clientId;
    this._redirectUri = redirectUri;
    this._code = null;
    // {"uid": "...", "access_token": "...", "expires_in": 14399, "token_type": "bearer", "refresh_token": "...", "account_id": "..."}
    this._tokenInfo = null;
    this._obtainedAt = null;
    this._inprogress = false;
    this._inprogressPromises = [];
    this._codeChallenge = null;
    this._localStorageKey = null;
  }

  persist(localStorageKey) {
    this._localStorageKey = localStorageKey;
    this._restore();
    this._persist();
  }

  _persist() {
    if (!this._localStorageKey) return;
    localStorage.setItem(this._localStorageKey, JSON.stringify({
      codeChallenge: this._codeChallenge,
      tokenInfo: this._tokenInfo,
      code: this._code,
      obtainedAt: this._obtainedAt
    }));
  }

  _restore() {
    if (!this._localStorageKey) return;
    let pojo;
    try {
      pojo = JSON.parse(localStorage.getItem(this._localStorageKey));
    } catch (e) {
      localStorage.removeItem(this._localStorageKey);
      pojo = null;
    }
    if (pojo === null) return;
    let {codeChallenge, tokenInfo, code, obtainedAt} = pojo;
    this._codeChallenge = codeChallenge;
    this._tokenInfo = tokenInfo;
    this._code = code;
    this._obtainedAt = obtainedAt;
  }

  generateAuthLink() {
    const L = 64;
    this._codeChallenge = "";
    for (let i = 0; i < L; i++) this._codeChallenge += randomElement(chars);
    let url = `https://www.dropbox.com/oauth2/authorize?client_id=${this._clientId}&response_type=code&token_access_type=offline&code_challenge=${this._codeChallenge}&code_challenge_method=plain`;
    if (this._redirectUri) url += `&redirect_uri=${encodeURIComponent(this._redirectUri)}`;
    this._persist();
    return url;
  }

  setCode(code) {
    if (this._code !== null) throw new Error("Code has already been set");
    this.reset();
    this._code = code;
    this._persist();
  }

  reset() {
    this._code = null;
    this._tokenInfo = null;
    this._obtainedAt = null;
    this._persist();
  }

  /**
   * @param {boolean=} refresh
   * @param {string=} refreshToken
   * @returns {Promise<string>}
   */
  token(refresh, refreshToken) {
    if (this._inprogress) return this._addToWaitList().then(() => this.token(refresh, refreshToken));

    if (this._code !== null) return this._exchangeForCode();

    if (refresh) return this._refresh(refreshToken);

    if (this._tokenInfo !== null) {
      if (new Date().getTime() - this._obtainedAt >= this._tokenInfo.expires_at) {
        return this._refresh();
      }
      return Promise.resolve(this._tokenInfo.access_token);
    }

    throw new Error("Authorization code is not present and it is not a refresh call");
  }

  present() {
    return this._code !== null || this._tokenInfo !== null;
  }

  /**
   * @returns {Promise<string>}
   */
  _exchangeForCode() {
    let body = new URLSearchParams();
    body.append("code", this._code);
    body.append("grant_type", "authorization_code");
    body.append("code_verifier", this._codeChallenge);
    this._codeChallenge = null;
    if (this._redirectUri) body.append("redirect_uri", this._redirectUri);
    body.append("client_id", this._clientId);
    this._code = null;

    this._startProgress();

    return fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      body,
      mode: "cors"
    })
      .then(response => {
        if (!response.ok) throw new Error("Can't exchange token for code");
        this._obtainedAt = new Date().getTime();
        return response.json();
      })
      .then(json => {
        this._tokenInfo = json;
        this._endProgress();
        this._persist();
        return this._tokenInfo.access_token;
      });
  }

  _startProgress() {
    if (this._inprogress) throw new Error("Already in progress");
    if (this._inprogressPromises.length > 0) throw new Error("Wait list is not empty");
    this._inprogress = true;
  }

  _endProgress() {
    let waitList = this._inprogressPromises.splice(0, this._inprogressPromises.length);
    this._inprogress = false;
    for (let resolve of waitList) resolve();
  }

  _addToWaitList() {
    let p = new Promise(resolve => {
      this._inprogressPromises.push(resolve);
    });
    
    return p;
  }

  /**
   * @param {string=} refreshToken
   * @returns {Promise<string>}
   */
  _refresh(refreshToken) {
    if (this._tokenInfo === null && !refreshToken) throw new Error("No refresh token either passed or stored");

    this._startProgress();

    let body = new URLSearchParams();
    body.append("refresh_token", refreshToken || this._tokenInfo.refresh_token);
    body.append("grant_type", "refresh_token");
    body.append("client_id", this._clientId);

    let oldTokenInfo = this._tokenInfo;
    this._tokenInfo = null;
    
    return fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      body,
      mode: "cors"
    })
      .then(response => {
        if (!response.ok) throw new Error("Can't refresh token");
        this._obtainedAt = new Date().getTime();
        return response.json();
      })
      .then(json => {
        this._endProgress();
        this._tokenInfo = Object.assign(oldTokenInfo, json);
        this._persist();
        return this._tokenInfo.access_token;
      });
  }
}

const charsToEncode = /[\u007f-\uffff]/g;

// see https://www.dropbox.com/developers/reference/json-encoding
// This function is simple and has OK performance compared to more
// complicated ones: http://jsperf.com/json-escape-unicode/4
function http_header_safe_json(v) {
  return JSON.stringify(v).replace(charsToEncode,
    function(c) {
      return '\\u'+('000'+c.charCodeAt(0).toString(16)).slice(-4);
    }
  );
}

const clientId = "6zhy69g9ly8zaua";

/**@type {Map<string, () => any>} */
const constructors = new Map();

const Serialization = {};

/**
 * @param {{__serialize: () => any}} o 
 * @returns {string}
 */
Serialization.serialize = o => {
  if (typeof o.__serialize === "function" && o.__proto__.constructor.__type) {
    let type = o.__proto__.constructor.__type;
    return JSON.stringify({
      type,
      data: o.__serialize()
    });
  } else {
    throw new Error("Can't serialize " + o);
  }
};

/**
 * @param {string} name 
 * @param {() => any} cons 
 */
Serialization.registerConstructor = (name, cons) => {
  if (constructors.has(name)) throw new Error("The constructor already exist: " + name);
  constructors.set(name, cons);
};

let _uCount = 0;

/**
 * @param {string | object} s 
 * @returns {any}
 */
Serialization.unserialize = (s) => {
  let pojo = s;
  if (typeof pojo == "string") pojo = JSON.parse(pojo);

  if (pojo.type) {
    try {
      _uCount++;
      let cons = constructors.get(pojo.type);
      if (cons === undefined) throw new Error("No constructor registered for type: " + pojo.type);
      let result = cons();
      result.__unserialize(pojo.data);
      return result;
    } finally {
      _uCount--;
    }
  } else {
    throw new Error("'type' expected. Can't unserialize " + pojo);
  }
};

/**
 * @param {{ __unserialize: (arg0: any) => void; }} o
 * @param {string} s
 */
Serialization.unserializeExisting = (o, s) => {
  let pojo = JSON.parse(s);
  if (pojo.type) {
    let constructor = eval(pojo.type);
    if (!constructor.prototype.__unserialize) throw new Error("Type " + constructor.name + " has no __unserialize instance method");
    if (o instanceof constructor) o.__unserialize(pojo.data);
    else throw new Error("Instance is not of the type " + pojo.type);
  } else {
    throw new Error("Can't unserialize " + pojo);
  }
};

Serialization.linkRequests = [];

Serialization.getLink = (id, consumer, defaultProducer) => {
  defaultProducer = defaultProducer || (() => undefined);
  if (_uCount == 0) throw new Error("getLink can only be called inside __unserialize mathod");
  Serialization.linkRequests.push({id, consumer, defaultProducer});
};

Serialization.resetLinks = () => Serialization.linkRequests = [];

Serialization.resolveLinks = links => {
  if (_uCount != 0) throw new Error("resolveLinks can only be called outside __unserialize mathod");
  Serialization.linkRequests.forEach(r => {
    let link;
    if (r.id instanceof Array) {
      link = r.id.map(it => {
        let link = links.get(it);
        if (link === undefined) {
          if (r.defaultProducer) link = r.defaultProducer();
          throw new Error("Unresolved link");
        }
      });
    } else {
      link = links.get(r.id);
      if (link === undefined) {
        if (r.defaultProducer) link = r.defaultProducer();
        else throw new Error("Unresolved link");
      }
    }
    r.consumer(link);
  });
};

class NebNog {
  /**
   * @param {Dropbox} dropbox 
   */
  constructor(dropbox) {
    this._dropbox = dropbox;

    /**@type {Map<string, NebNogTemplate>} */
    this._templates = new Map();
  }

  /**
   * @returns {Promise<void>}
   */
  loadTemplates() {
    return this._dropbox.list("/.templates")
      .then(files => {
        return Promise.all(files.map(f => this._dropbox.download(`/.templates/${f}`)))
          .then(contents => contents.forEach(content => this._addTemplate(Serialization.unserialize(content))));
      })
      .catch(e => {
        if (e instanceof ConflictException) return;
        else throw e;
      });
  }

  /**
   * @param {NebNogTemplate} template
   * @returns {Promise<void>}
   */
  addTemplate(template) {
    let path = `/.templates/${template.name}.json`;

    return this._dropbox.upload(path, Serialization.serialize(template))
      .catch(e => {
        if (e instanceof ConflictException) {
          throw new Error("You are making notes too frequently. Calm down a bit.");
        }
        throw e;
      })
      .then(() => {
        this._addTemplate(template);
      });
  }

  /**
   * @param {NebNogTemplate} template
   */
  _addTemplate(template) {
    this._templates.set(template.name, template);
  }

  /**
   * @param {string} templateName 
   */
  createNote(templateName) {
    let template = this._templates.get(templateName);
    if (template === undefined) throw new Error(`No such template: ${templateName}`);
    return new NebNogNote(template, this);
  }

  /**
   * @param {NebNogNote} note 
   * @returns {Promise<void>}
   */
  _saveNote(note) {
    let now = new Date();
    let month = appendZero(now.getMonth() + 1);
    let day = appendZero(now.getDate());
    let hour = appendZero(now.getHours());
    let minutes = appendZero(now.getMinutes());
    let seconds = appendZero(now.getSeconds());
    let path = `/${now.getFullYear()}/${month}/${day}/${hour}:${minutes}:${seconds}.md`;

    let noteJson;
    try {
      noteJson = note.toText();
    } catch (e) {
      if (e instanceof NotValidExeption) return Promise.reject(e);
      throw e;
    }

    return this._dropbox.upload(path, noteJson)
      .catch(e => {
        if (e instanceof ConflictException) {
          throw new Error("You are making notes too frequently. Calm down a bit.");
        }
        throw e;
      });
  }
}

class NebNogField {
  /**
   * @param {boolean=} optional
   */
  constructor(optional) {
    this._optional = optional ? true : false;
  }

  validate(value) {
    return true;
  }

  /**
   * @returns {HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement}
   */
  toHtmlElement() {
    throw new Error("Not implemented");
  }

  /**
   * @param {string} name
   * @param {string} value 
   * @returns {string}
   */
  toText(name, value) {
    return `## ${name}\n${value}`;
  }

  __serialize() {
    return {
      optional: this._optional
    };
  }

  /**
   * @param {object} pojo
   * @returns {void}
   */
  __unserialize(pojo) {
    this._optional = pojo.optional;
  }
}
Serialization.registerConstructor(NebNogField.__type = "NebNogField", () => new NebNogField());

class TextField extends NebNogField {
  /**
   * @param {{rows?: number, minLen?: number, maxLen?: number, regex?: RegExp, optional?: boolean}=} options
   */
  constructor(options) {
    options = Object.assign(
      { rows: undefined, minLen: undefined, maxLen: undefined, regex: undefined, optional: false },
      options || {});
    super(options.optional);
    this._minLen = options.minLen;
    this._maxLen = options.maxLen;
    this._regex = options.regex;
    this._rows = options.rows || 1;
  }

  toHtmlElement() {
    let el;
    if (this._rows > 1) {
      el = document.createElement("textarea");
      el.rows = this._rows;
    } else {
      el = document.createElement("input");
      el.type = "text";
    }
    if (this._minLen) el.minLength = this._minLen;
    if (this._maxLen) el.maxLength = this._maxLen;
    return el;
  }

  validate(value) {
    return typeof value == "string"
      && (this._optional || !value.match(/^\s*$/))
      && (this._minLen === undefined || value.length >= this._minLen)
      && (this._maxLen === undefined || value.length <= this._maxLen)
      && (this._regex === undefined || value.match(this._regex) !== null);
  }

  __serialize() {
    return Object.assign(super.__serialize(), {
      minLen: this._minLen,
      maxLen: this._maxLen,
      regex: this._regex,
      rows: this._rows
    });
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this._minLen = pojo.minLen;
    this._maxLen = pojo.maxLen;
    this._regex = pojo.regex;
    this._rows = pojo.rows;
  }
}
Serialization.registerConstructor(TextField.__type = "TextField", () => new TextField());

class BooleanField extends NebNogField {
  /**
   * @param {string} yes
   * @param {string} no
   * @param {boolean=} optional
   */
  constructor(yes, no, optional) {
    super(optional);
    this._yes = yes;
    this._no = no;
  }

  validate(value) {
    return value == this._yes || value == this._no;
  }

  toHtmlElement() {
    let el = document.createElement("input");
    el.type = "checkbox";
    el.value = this._no;
    el.onchange = () => el.checked ? el.value = this._yes : this._no;
    return el;
  }

  /**
   * @param {string} name
   * @param {string} value 
   * @returns {string}
   */
  toText(name, value) {
    return `**${name}:** ${value}`;
  }

  __serialize() {
    let pojo = super.__serialize();
    pojo.yes = this._yes;
    pojo.no = this._no;
    return pojo;
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this._yes = pojo.yes;
    this._no = pojo.no;
  }
}
Serialization.registerConstructor(BooleanField.__type = "BooleanField", () => new BooleanField(null, null));

class SelectionField extends NebNogField {
  /**
   * @param {string[]} options
   * @param {boolean=} optional
   */
  constructor(options, optional) {
    super(optional);
    this._options = options;
  }

  validate(value) {
    return this._optional || this._options.indexOf(value) > -1;
  }

  toHtmlElement() {
    let el = document.createElement("select");
    
    let emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.text = "";
    el.add(emptyOpt, null);

    this._options.forEach(value => {
      let opt = document.createElement("option");
      opt.value = value;
      opt.text = value;
      el.add(opt, null);
    });

    return el;
  }

  /**
   * @param {string} name
   * @param {string} value 
   * @returns {string}
   */
  toText(name, value) {
    return `**${name}:** ${value}`;
  }

  __serialize() {
    return Object.assign(super.__serialize(), {
      options: this._options
    });
  }

  __unserialize(pojo) {
    super.__unserialize(pojo);
    this._options = pojo.options;
  }
}
Serialization.registerConstructor(SelectionField.__type = "SelectionField", () => new SelectionField([]));

class NebNogTemplate {
  /**
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
    /**@type {Map<string, NebNogField>} */
    this._fields = new Map();
  }

  /**
   * @param {string} name
   */
  getField(name) {
    let f = this._fields.get(name);
    if (f === undefined) throw new Error(`No such field: ${name}`);
    return f;
  }

  /**
   * @returns {Map<string, NebNogField>}
   */
  getAllFields() {
    return this._fields;
  }

  /**
   * @param {string} name
   * @param {NebNogField} field 
   */
  addField(name, field) {
    if (this._fields.has(name)) throw new Error("Field with the name already exist: " + name);
    this._fields.set(name, field);
  }

  __serialize() {
    let fields = {};
    this._fields.forEach((f, n) => fields[n] = Serialization.serialize(f));
    return {
      name: this.name,
      fields
    };
  }

  /**
   * @param {object} pojo
   */
  __unserialize(pojo) {
    this.name = pojo.name;
    this._fields = new Map();
    Object.keys(pojo.fields)
      .forEach(name => this._fields.set(name, Serialization.unserialize(pojo.fields[name])));
  }
}
Serialization.registerConstructor(NebNogTemplate.__type = "NebNogTemplate", () => new NebNogTemplate(""));

class NotValidExeption extends Error {
  constructor(name, value) {
    super(`The value of the field ${name} is not valid: ${value}`);
    this.name = name;
    this.value = value;
  }
}

class NebNogNote {
  /**
   * @param {NebNogTemplate} template
   * @param {NebNog} nebnog
   */
  constructor(template, nebnog) {
    this._template = template;
    this._nebnog = nebnog;
    /**@type {Map<string, string>} */
    this._values = new Map();
  }

  setFieldValue(name, value) {
    let f = this._template.getField(name);
    if (!f) throw new Error("No such field: " + name);

    if (value.match(/^\s*$/) && f._optional) return;

    if (f.validate(value)) {
      this._values.set(name, value);
      return;
    }

    throw new NotValidExeption(name, value);
  }

  /**
   * @returns {Promise<void>}
   */
  save() {
    return this._nebnog._saveNote(this);
  }

  /**
   * @returns {object}
   * @throws {NotValidExeption}
   */
  _toObject() {
    this._template.getAllFields().forEach((f, n) => {
      if (!f._optional && !this._values.has(n)) throw new NotValidExeption(n, "");
    });
    let values = {};
    this._values.forEach((value, name) => values[name] = value);
    return {template: this._template.name, values};
  }

  /**
   * @returns {string}
   * @throws {NotValidExeption}
   */
  toText() {
    this._template.getAllFields().forEach((f, n) => {
      if (!f._optional && !this._values.has(n)) throw new NotValidExeption(n, "");
    });
    let result = `# ${this._template.name}\n`;
    this._values.forEach((value, name) => result += `\n${this._template.getField(name).toText(name, value)}\n`);
    return result;
  }
}

function appendZero(v) {
  return v < 10 ? "0" + v : "" + v;
}

/**@type {Map<HTMLElement, {spinnerDiv: HTMLDivElement, nesting: number}>} */
let spinners = new Map();

function spinner(el) {
  el = el || document.body;

  let s = spinners.get(el);
  if (s !== undefined) {
    s.nesting++;
    return;
  }

  let spinnerDiv = document.createElement("div");
  spinnerDiv.style.position = "absolute";
  spinnerDiv.style.left = el.offsetLeft + "px";
  spinnerDiv.style.top = el.offsetTop + "px";
  spinnerDiv.style.width = el.offsetWidth + "px";
  spinnerDiv.style.height = el.offsetHeight + "px";
  spinnerDiv.style.backgroundColor = "#eeeeee";
  spinnerDiv.style.opacity = "0.8";
  document.body.appendChild(spinnerDiv);

  let d = document.createElement("div");
  d.classList.add("loader");
  d.innerText = "Loading...";

  spinnerDiv.appendChild(d);

  el.appendChild(spinnerDiv);

  spinners.set(el, {spinnerDiv, nesting: 1});
}

function unspinner(el) {
  el = el || document.body;

  let s = spinners.get(el);
  if (s === undefined) throw new Error("unspinner() call without calling spinner()");

  s.nesting--;
  
  if (s.nesting > 0) return;
  
  s.spinnerDiv.parentNode.removeChild(s.spinnerDiv);
  s.spinnerDiv = null;

  spinners.delete(el);
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {HTMLElement=} el
 * @returns {Promise<T>}
 */
function withSpinner(promise, el) {
  spinner(el);
  return promise
    .then(result => {
      unspinner(el);
      return result;
    })
    .catch(reason => {
      unspinner(el);
      throw reason;
    });
}

if (window.location.protocol == "http:" && !window.location.host.match(/^localhost/)) {
  window.location = window.location.href.replace(/^http:/, "https:");
}

const btnAuth = document.getElementById("btnAuth");
const authForm = document.getElementById("authForm");
const addNoteForm = document.getElementById("frmAddNote");
/**@type {HTMLButtonElement} */
const btnCreate = document.getElementById("btnNewNote");

let auth = new DropboxAuth(clientId, window.location.href.replace(/\?.*$/,""));
auth.persist("dropboxAuth");

let dropbox = new Dropbox(auth);
let nebnog = new NebNog(dropbox);

let query = new URLSearchParams(window.location.search);
let code = query.get("code");
if (code) {
  auth.setCode(code);
  history.replaceState({}, "", window.location.pathname);
}

authForm.style.display = "none";
addNoteForm.style.display = "none";

if (auth.present()) {
  withSpinner(
    nebnog.loadTemplates()
      .then(() => {
        if (nebnog._templates.size == 0) {
          return createDefaultTemplates();
        }
      })
      .then(initialized));
} else {
  authForm.style.display = "block";
  addNoteForm.style.display = "none";
}

btnAuth.onclick = () => {
  btnAuth.style.display = "none";
  openUrl(auth.generateAuthLink());
};

/**
 * @param {string} text 
 * @param {HTMLElement=} el 
 */
function message(text, el) {
  el = el || document.body;

  let mark = document.createElement("mark");
  mark.classList.add("message");
  mark.innerText = text;

  el.after(mark);

  setTimeout(() => mark.parentNode.removeChild(mark), 3000);
}

/**
 * @param {string} text 
 * @param {HTMLElement} el 
 */
function error(text, el) {
  if (el.nextSibling !== null && el.nextSibling.classList && el.nextSibling.classList.contains("error")) {
    el.nextSibling.parentNode.removeChild(el.nextSibling);
  }

  el.classList.add("error");

  let mark = document.createElement("mark");
  mark.classList.add("error");
  mark.classList.add("message");
  mark.innerText = text;

  el.after(mark);
}

function openUrl(url, newWindow) {
  if (newWindow) {
    let w = window.open(url, "dropboxauth");
    if (w == null) {
      message("Please allow pop-ups and reload the page");
      return null;
    } else {
      w.focus();
      return () => w.close();
    }
  }

  window.location = url;
  return () => true;
}

/**@type {Map<string, (HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement)>} */
let fields = new Map();

/**@type {NebNogTemplate} */
let template;

/**@type {HTMLSelectElement} */
const noteTemplate = $("noteTemplate");
btnCreate.disabled = true;
noteTemplate.onchange = () => {
  btnCreate.disabled = true;
  let noteFields = $("noteFields");
  noteFields.innerHTML = "";
  fields.clear();

  if (noteTemplate.selectedIndex < 1) return;

  btnCreate.disabled = false;

  /**@type {NebNogTemplate} */
  template = noteTemplate.options[noteTemplate.selectedIndex]._template;

  template.getAllFields().forEach((f, name) => {
    let el = f.toHtmlElement();
    el.id = uuid();
    el.required = !f._optional;
    fields.set(name, el);
    el.onchange = () => {
      el.classList.remove("error");
    };

    if (el.tagName == "INPUT" && el.type == "checkbox") {
      let label = document.createElement("label");
      let text = document.createTextNode(" " + name);
      label.htmlFor = el.id;
      label.appendChild(text);

      let p = document.createElement("p");
      p.appendChild(el);
      p.appendChild(label);

      noteFields.appendChild(p);
    } else {
      let label = document.createElement("label");
      label.htmlFor = el.id;
      label.innerText = name;

      let p = document.createElement("p");
      p.appendChild(label);
      p.appendChild(el);

      noteFields.appendChild(p);
    }
  });
};

btnCreate.onclick = () => {
  let note = nebnog.createNote(template.name);
  let valid = true;
  try {
    for (let el of addNoteForm.querySelectorAll(".error + mark")) el.parentNode.removeChild(el);
    fields.forEach(el => el.classList.remove("error"));
    fields.forEach((el, name) => note.setFieldValue(name, el.value));
  } catch (e) {
    if (e instanceof NotValidExeption) {
      let el = fields.get(e.name);
      error(e.message, el);
      valid = false;
    }
    else throw e;
  }

  if (valid) {
    withSpinner(
      note.save()
          .then(() => message("Created!", btnCreate))
          .then(() => {
            noteTemplate.selectedIndex = 0;
            noteTemplate.onchange();
          })
          .catch(e => {
            if (e instanceof UnauthorizedException) {
              auth.reset();
              message("ERROR: Unauthorized. Please authorize Dropbox");
              authForm.style.display = "block";
              addNoteForm.style.display = "none";
              return;
            } else if (e instanceof NotValidExeption) {
              let el = fields.get(e.name);
              error(e.message, el);
              return;
            }
            message("ERROR: " + e.toString(), btnCreate);
          }),
      addNoteForm);
    }
};

function initialized() {
  authForm.style.display = "none";
  addNoteForm.style.display = "block";
  $("noteFields").innerHTML = "";

  let emptyOpt = document.createElement("option");
  emptyOpt.value = "";
  emptyOpt.text = "Select a template";
  noteTemplate.add(emptyOpt, null);

  nebnog._templates.forEach(template => {
    let opt = document.createElement("option");
    opt.value = "";
    opt.text = template.name;
    opt._template = template;
    noteTemplate.add(opt, null);
  });
}

function createDefaultTemplates() {
  let templates = [];

  let t = new NebNogTemplate("Как прошёл день");
  t.addField("Спорт", new SelectionField(["Тайчи", "Велик"], true));
  t.addField("Голова", new BooleanField("Болела", "Не болела"));
  t.addField("Шея", new BooleanField("Болела", "Не болела"));
  t.addField("Приступ", new SelectionField(["Нет", "Несильно", "Сильно"], true));
  t.addField("Алкоголь", new SelectionField(["Нет", "Немного", "Да"]));
  t.addField("Заметки", new TextField({optional: true, rows: 5}));
  templates.push(t);

  t = new NebNogTemplate("Дневничок");
  t.addField("Заметки", new TextField({rows: 5}));
  templates.push(t);
  
  return withSpinner(Promise.all(templates.map(t => nebnog.addTemplate(t))));
}

function $(id) {
  return document.getElementById(id);
}

function uuid() {
  return "id" + random(0, 1 << 30);
}
