const Persister = (function () {
  const itemName = "life";

  function __loadStorage() {
    let json = localStorage.getItem(itemName);
    if (json == null) json = "{}";
    return JSON.parse(json);
  }
  
  return {
    names: () => {
      return Object.getOwnPropertyNames(__loadStorage());
    },
  
    load: name => {
      return Serialization.unserialize(__loadStorage()[name]);
    },
  
    save: (name, o) => {
      const storage = __loadStorage();
      storage[name] = Serialization.serialize(o);
      localStorage.setItem(itemName, JSON.stringify(storage));
    }
  };
})();
