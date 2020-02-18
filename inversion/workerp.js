/**
 * Creates a worker on the caller's side.
 *
 * @param scriptSource the *.js file with the worker's code.
 */
function Workerp(scriptSource) {
  this.scriptSource = scriptSource;
  this._init();
}

Workerp.callId = 1;

Workerp.prototype._init = function () {
  this.worker = new Worker(this.scriptSource);
  this.promises = {};

  var self = this;
  this.worker.onmessage = function (e) {
    var callId = e.data.callId;
    if (!callId) {
      throw new Error("Worker [" + this.scriptSource + "] must return callId as the part of event.data");
    }

    if (!self.promises[callId]) {
      throw new Error("Worker [" + this.scriptSource + "] returned unknown callId " + callId);
    }

    var resolve = self.promises[callId].resolve;
    delete self.promises[callId];

    resolve(e.data.result);
  };
};

/**
 * Submit a job to the worker with the params.
 * 
 * Returns a promise that will be resolved while the job been done by the worker.
 */
Workerp.prototype.call = function (params) {
  return new Promise((resolve, reject) => {
    var callId = Workerp.callId;
    Workerp.callId++;

    this.promises[callId] = {
      resolve: resolve,
      reject: reject
    };

    this.worker.postMessage({
      callId: callId,
      params: params
    });
  });
};

/**
 * Register a worker message handler calback on the worker side.
 * Like this:
 * 
 * Workerp.message(function (params) {
 *   return Promise.resolve(doWorkerJob(params));
 * });
 */
Workerp.message = function (callback) {
  onmessage = function (e) {
    if (!e.data.callId) {
      throw new Error("callId must be part of event.data");
    }

    callback(e.data.params).then(function (result) {
      postMessage({
        callId: e.data.callId,
        result: result
      });
    });
  };
};

Workerp.prototype.reset = function () {
  this.worker.terminate();
  this._init();
};

class WorkerPool {
  constructor(poolSize, scriptFile) {
    this.pool = [];
    this.idx = 0;

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Workerp(scriptFile));
    }
  }

  call(params) {
    const result = this.pool[this.idx].call(params);
    this.idx = (this.idx + 1) % this.pool.length;
    return result;
  }

  reset() {
    this.pool.forEach(thread => thread.reset());
  }
}