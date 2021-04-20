let RemoteProxy = {};

RemoteProxy.of = (o, scripts) => {
  let worker = new Workerp("remote-worker.js");
  return worker
  .call({
    init: Serialization.serialize(o),
    scripts
  })
  .then(() => {
    return new Proxy(o, {
      get: (target, name) => {
        if (name === "getProxyTarget") {
          return () => worker.call({ getOriginal: true })
                       .then(o => Serialization.unserialize(o));
        }
        if (name === "setProxyTarget") {
          return target => worker.call({ setOriginal: Serialization.serialize(target) });
        }

        if (!(name in target)) return undefined;

        if (typeof target[name] === "function") {
          return function () {
            const args = [...arguments];
            return worker.call({
              call: {
                name,
                args
              }
            });
          }
        } else {
          return worker.call({
            get: name
          });
        }
      }
    });
  });
};