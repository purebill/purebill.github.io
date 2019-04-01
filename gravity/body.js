function Body(p, m, v, r, color) {
  this.p = p;
  this.m = m;
  this.v = v;
  this.r = r;
  this.color = color;
  this.f = [0, 0];
  this.autopilot = {
    on: false
  };
  this.particle = false;
  this.collapsed = false;

  this.jet = {
    left: false,
    right: false,
    top: false,
    bottom: false
  };
  this.static = false;
  this.trail = [];
}

Body.builder = () => {
  return new Proxy({}, {
    get: (obj, key, proxy) => {
      if (key === "build") return () => Object.assign(new Body(), obj);
      else return (v) => {
        obj[key] = v;
        return proxy;
      }
    }
  });
};

Body.prototype.applyForce = function(fx, fy) {
  if (fx !== null) {
    this.f[0] = fx;
    this.jet.left = this.jet.right = false;
    if (Math.abs(fx) > 1e-6) {
      this.jet.left = fx > 0;
      this.jet.right = fx < 0;
    }
  }
  if (fy !== null) {
    this.f[1] = fy;
    this.jet.top = this.jet.bottom = false;
    if (Math.abs(fy) > 1e-6) {
      this.jet.top = fy < 0;
      this.jet.bottom = fy > 0;
    }
  }
};
