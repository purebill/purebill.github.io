var ShamirSharing = (function () {
  const bits = 256;
  const modulo = 207461726616729670624863199807187459214560552059330088878235850262289509352267n;

  function xgcd(a, b) {
    if (b === 0n) {
      return [1n, 0n, a];
    }

    let [x, y, d] = xgcd(b, a % b);
    return [y, x - y * (a / b), d];
  }

  /**
   * @param {bigint} m
   */
  BigInt.prototype.modInverse = function (m) {
    if (m < 0)
      throw new Error("BigInteger: modulus not positive");

    if (m === 1n) return 0n;

    if (this % m === 1n) return 1n;

    return xgcd(this, m)[0];
  }

  BigInt.parse = function (value, radix) {
    return [...value.toString()]
      .reduce((r, v) => r * BigInt(radix) + BigInt(parseInt(v, radix)), 0n);
  }

  function create(nParties, nIsEnough, key) {
    if (nParties < 1) throw new Error("nParties can't be less than 1");
    if (nParties < nIsEnough) throw new Error("nIsEnough should not be greater than nParties)");

    let poly = createPoly(bits, nIsEnough);
    if (key) poly[0] = key;

    let parties = [];

    let takenX = new Set();
    for (let party = 0; party < nParties; party++) {
      let x;
      do {
        x = randomBigInt(bits) % modulo;
      } while (takenX.has(x));
      takenX.add(x);

      let y = calcPoly(poly, x, modulo);
      parties.push(new XY(x, y));
    }

    return new KeyAndParties(bits, modulo, poly[0], parties);
  }

  function calcPoly(poly, x, modulo) {
    let result = poly[poly.length - 1];
    if (poly.length == 1) return result % modulo;

    for (let i = poly.length - 2; i >= 0; i--) {
      result = (result * x + poly[i]) % modulo;
    }

    return result;
  }

  function createPoly(bits, n) {
    let poly = [];
    for (let i = 0; i < n; i++) {
      poly.push(randomBigInt(bits) % modulo);
    }

    return poly;
  }

  /**
   * @param {XY[]} points 
   */
  function restoreKey(points) {
    let n = points.length;

    let result = 0n;

    for (let i = 0; i < n; i++) {
      let x = points[i].x;

      let numerator = points[i].y;
      if (n % 2 == 0) {
        numerator = modulo - numerator;
      }
      let denominator = 1n;

      for (let j = 0; j < n; j++) {
        if (j == i) continue;
        numerator = (numerator * points[j].x) % modulo;
        if (numerator < 0n) numerator += modulo;

        denominator = (denominator * (x - points[j].x)) % modulo;
        if (denominator < 0n) denominator += modulo;
      }

      result = (result + numerator * denominator.modInverse(modulo)) % modulo;
      if (result < 0n) result += modulo;
    }

    return result;
  }


  class KeyAndParties {
    constructor(bits, module, key, parties) {
      this.bits = bits;
      this.modulo = module;
      this.key = key;
      this.parties = parties;
    }
  }

  class XY {
    /**
     * 
     * @param {bigint} x 
     * @param {bigint} y 
     */
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  }

  function randomBigInt(bits) {
    let bytes = Math.floor(bits / 8);
    if (bits % 8 > 0) bytes += 1;

    let a = new Uint8Array(bytes);
    crypto.getRandomValues(a);

    if (bits % 8 > 0) {
      a[0] &= (1 << (bits % 8)) - 1;
    }

    return bytesToBigInt(a);
  }

  function bytesToBigInt(bytes) {
    let result = 0n;
    for (let i = 0; i < bytes.length; i++) {
      result = (result << 8n) + BigInt(bytes[i]);
    }
    return result;
  }

  function bigIntToBytes(n, bytes) {
    let result = new Uint8Array(bytes);
    for (let i = bytes - 1; i >= 0; i--) {
      result[i] = new Number(n & 255n);
      n = n >> 8n;
    }
    return result;
  }

  function encrypt(plaintext, nParties, nIsEnough) {
    const textBytes = new TextEncoder().encode(plaintext);
    const maxBytes = Math.ceil(bits / 8);
    if (textBytes.length > maxBytes) throw new Error("plaintext must be shorter than " + maxBytes + " bytes");
    const textN = bytesToBigInt(textBytes);
    const secret = create(nParties, nIsEnough, textN);

    return secret.parties.map(it => 
        it.x.toString(36) + "-" + it.y.toString(36) + "-" + textBytes.length);
  }

  function decrypt(shares) {
    const key = restoreKey(shares.map(it => {
      const a = it.split("-");
      return new XY(BigInt.parse(a[0], 36), BigInt.parse(a[1], 36));
    }));
    
    const length = parseInt(shares[0].split("-")[2]);
    const textN = key;    
    const textBytes = bigIntToBytes(textN, length);
    return new TextDecoder("utf-8").decode(textBytes);
  }

  return {
    encrypt,
    decrypt,
    create,
    restoreKey
  };
})();