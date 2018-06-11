var findFraction = function () {
    function gcd(a, b) {
        if (a > b) {
            var tmp = a;
            a = b;
            b = tmp;
        }

        if (a == 0) {
            return b;
        }

        for (;;) {
            var r = b % a;
            if (r == 0) {
                return a;
            }
            if (r == 1) {
                return 1;
            }

            b = a;
            a = r;
        }
    }

    function Fraction(a, b) {
        var theGcd = gcd(a, b);
        this.n = a / theGcd;
        this.d = b / theGcd;
    }

    Fraction.prototype.value = function () {
        return this.n / this.d;
    };

    Fraction.prototype.addWhole = function (wholePart) {
        return new Fraction(this.n + this.d * wholePart, this.d);
    };

    Fraction.prototype.toString = function () {
        return this.n + " / " + this.d;
    };

    function findFraction(v, N) {
        var wholePart = Math.floor(v);

        var a = new Fraction(0, 1).addWhole(wholePart);
        var b = new Fraction(1, 1).addWhole(wholePart);
        var f = v - a.value() < b.value() - v ? a : b;

        for (;;) {
            var c = new Fraction(a.n + b.n, a.d + b.d);
            if (c.n > N || c.d > N) {
                return f;
            }
            if (Math.abs(v - c.value()) < Math.abs(v - f.value())) {
                f = c;
            }
            if (v < c.value()) {
                b = c;
            } else {
                a = c;
            }
        }
    }

    return findFraction;
} ();
