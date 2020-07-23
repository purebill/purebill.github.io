/**@type {Map<string, (any) => any>} */
const constructors = new Map();

const Serialization = {};

/**
 * @param {{__serialize: () => any}} o 
 * @returns {object}
 */
Serialization.toPojo = o => {
  if (typeof o.__serialize === "function" && o.__proto__.constructor.__type) {
    let type = o.__proto__.constructor.__type;
    return {
      type,
      data: o.__serialize()
    };
  } else {
    throw new Error("Can't serialize " + o);
  }
};

/**
 * @param {{__serialize: () => any}} o 
 * @returns {string}
 */
Serialization.serialize = o => {
  return JSON.stringify(Serialization.toPojo(o));
};

/**
 * @param {string} name 
 * @param {() => any} cons 
 */
Serialization.registerConstructor = (name, cons) => {
  if (constructors.has(name)) throw new Error("The constructor already exist: " + name);
  constructors.set(name, cons);
}

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
      let result = cons(pojo.data);
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
 * @param {object} pojo
 */
Serialization.unserializeExisting = (o, pojo) => {
  if (pojo.type) {
    o.__unserialize(pojo.data);
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

export default Serialization;