const Serialization = {};

Serialization.serialize = o => {
  if (typeof o.__serialize === "function") {
    return {
      type: o.__proto__.constructor.name,
      data: o.__serialize()
    }
  } else {
    throw new Error("Can't serialize " + o);
  }
};

Serialization._uCount = 0;
Serialization.unserialize = pojo => {
  if (pojo.type) {
    let constructor = eval(pojo.type);
    try {
      Serialization._uCount++;
      return constructor.__unserialize(pojo.data);
    } finally {
      Serialization._uCount--;
    }
  } else {
    throw new Error("Can't unserialize " + pojo);
  }
};

Serialization.unserializeExisting = (o, pojo) => {
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
  if (Serialization._uCount == 0) throw new Error("getLink can only be called inside __unserialize mathod");
  Serialization.linkRequests.push({id, consumer, defaultProducer});
};

Serialization.resetLinks = () => Serialization.linkRequests = [];

Serialization.resolveLinks = links => {
  if (Serialization._uCount != 0) throw new Error("resolveLinks can only be called outside __unserialize mathod");
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

