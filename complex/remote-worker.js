importScripts(
  "serialization.js",
  "workerp.js",
);

let o;

Workerp.message(params => {
  if (params.init) {
    if (params.scripts) importScripts.apply(null, params.scripts);
    o = Serialization.unserialize(params.init);
    return Promise.resolve(true);
  } else if (params.call) {
    const call = params.call;
    return Promise.resolve(o[call.name].apply(o, call.args));
  } else if (params.get) {
    const name = params.get;
    return Promise.resolve(o[name]);
  } else if (params.getOriginal) {
    return Promise.resolve(Serialization.serialize(o));
  } else if (params.setOriginal) {
    o = Serialization.unserialize(params.setOriginal);
    return Promise.resolve(true);
  } else throw new Error("Unsupported message: " + params);
});