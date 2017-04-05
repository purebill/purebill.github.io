/* global md5: false */

function Random(seed) {
  this.reset(seed);
}

Random.prototype.reset = function (seed) {
  this._state = seed || md5(Math.random().toString()).toString();
  this._seedPos = 0;

  this.seed = this._state;
};

Random.prototype.nextInt = function () {
  var random = parseInt(this._state.substr(this._seedPos, 8), 16);
  if (this._seedPos === 24) {
    this._seedPos = 0;
    this._state = md5(this._state).toString();
  }
  this._seedPos += 8;
  return random;
};

Random.prototype.nextFloat = function (max, min) {
  var random = this.nextInt() / 65536 / 65536;
  return min + (max - min) * random;
};