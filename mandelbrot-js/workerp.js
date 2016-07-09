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
            throw new Error("Worker [" + scriptSource + "] must return callId as the part of event.data");
        }

        if (!self.promises[callId]) {
            throw new Error("Worker [" + scriptSource + "] returned unknown callId " + callId);
        }

        var resolve = self.promises[callId].resolve;
        delete self.promises[callId];

        resolve(e.data.result);
    };
}

/**
 * Submit a job to the worker with the params.
 * 
 * Returns a promise that will be resolved while the job been done by the worker.
 */
Workerp.prototype.call = function (params) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var callId = Workerp.callId;
        Workerp.callId++;

        self.promises[callId] = {
            resolve: resolve,
            reject: reject
        };

        self.worker.postMessage({
            callId: callId,
            params: params
        });
    });
}

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
}

Workerp.prototype.reset = function () {
    this.worker.terminate();
    this._init();
}