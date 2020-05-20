let Serialization = {};

Serialization.serialize = o => {
  if (typeof o.__serialize === "function") {
    return {
      __constructor__: o.__proto__.constructor.name,
      __data__: o.__serialize()
    }
  } else {
    return {
      __data__: o
    }
  }
};

Serialization.unserialize = json => {
  if (json.__constructor__) {
    return eval(json.__constructor__).__unserialize(json.__data__);
  } else {
    return json.__data__;
  }
};