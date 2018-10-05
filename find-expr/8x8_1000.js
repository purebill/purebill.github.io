function Metrics(name) {
  let System = Java.type("java.lang.System");

  let totalTries = 0;
  let tries = 0;
  let lastTime = System.currentTimeMillis();
  let lastSpeed = 0;
  let startTime = lastTime;

  return {
    reset: function () {
      totalTries = 0;
      tries = 0;
      lastTime = startTime = System.currentTimeMillis();
      lastSpeed = 0;
    },
    tick: function (n) {
      tries += n;
      totalTries += n;

      if (totalTries % 100000 == 0) {
        let currentTime = System.currentTimeMillis();
        let currentSpeed = tries / (currentTime - lastTime) * 1000;
        let avgSpeed = (lastSpeed + currentSpeed) / 2;
        lastSpeed = avgSpeed;
        System.out.print(name + ": " + totalTries + ". " + Math.round(avgSpeed) + " " + name + "/sec.                                       \r");

        lastTime = System.currentTimeMillis();
        tries = 0;
      }
    },
    total: function () {
      let currentTime = System.currentTimeMillis();
      let seconds = (currentTime - startTime) / 1000;
      let avgSpeed = Math.round(totalTries / seconds);
      print(name + ": " + totalTries + " in " + Math.round(seconds) + " seconds. " + avgSpeed + " " + name + "/sec.                                       ");
    }
  };
}

if (typeof Map === "undefined") {
  Map = function () {
    this._map = {};
  }

  Map.prototype.set = function(k, v) {
    this._map[k] = v;
  };

  Map.prototype.get = function (k) {
    return this._map[k];
  };
  Map.prototype.has = function (k) {
    return this._map[k] !== undefined;
  };
  Map.prototype.delete = function (k) {
    delete this._map[k];
  };
}

function findExpr2(digits, EXPECTED, OPS, group) {
  print("Finding: [" + digits + "], " + EXPECTED + ", [" + OPS + "]" + (group ? " with grouping" : " no grouping"));

  let found = new Map();
  let foundIdx = 1;
  let exprMetrics = Metrics("tries");

  // reuse the same arrays for expr and stack for performance sake
  let expr = [];
  let exprIdx = 0;
  let stack = [];
  let stackIdx = 0;

  trySpaces(digits, new Map(), group);
  exprMetrics.total();

  function trySpaces(digits, spaces, group) {
    if (!group) {
      for (let i = 1; i < digits.length; i++) {
        spaces.set(i, true);
      }
    }

    tryOps(toNumbers(digits, spaces), new Map(), 0);
    
    if (group) {
      for (let i = 1; i < digits.length; i++) {
        if (!spaces.has(i)) {
          spaces.set(i, true);
          trySpaces(digits, spaces, group);
          spaces.delete(i);
        }
      }
    }
  }

  function tryOps(numbers, opsMap, opsCount) {
    if (opsCount > numbers.length - 1) return;

    if (opsCount == numbers.length - 1) {
      evalAndCheck(numbers, opsMap);
      return;
    }

    for (let idx = 1; idx < numbers.length; idx++) {
      let numbersCount = idx + 1;
      if (numbersCount <= opsCount + 1) continue;

      for (let i = 0; i < OPS.length; i++) {
        let op = OPS[i];
      
        opsMap.has(idx) ? opsMap.get(idx).push(op) : opsMap.set(idx, [op]);
        tryOps(numbers, opsMap, opsCount + 1);
        opsMap.get(idx).pop();
      }
    }
  }

  function evalAndCheck(numbers, opsMap) {
    exprIdx = 0;

    for (let i = 0; i < numbers.length; i++) {
      expr[exprIdx++] = numbers[i];
      if (opsMap.has(i)) {
        let ops = opsMap.get(i);
        for (let j = 0; j < ops.length; j++) {
          expr[exprIdx++] = ops[j];
        }
      }
    }

    exprMetrics.tick(1);

    // print(expr.slice(0, exprIdx));
    // let res = eval(toJsExpr(expr));
    let res = evalPostfix(expr, exprIdx);

    if (res == EXPECTED) {
      let exprStr = simplify(toInfix(expr, exprIdx, true));
      if (!found.has(exprStr)) {
        found.set(exprStr, foundIdx);
        print(foundIdx + ". " + simplify(toInfix(expr, exprIdx, false)) + " = " + EXPECTED
          + "                                                                            ");
        foundIdx++;
      }
    }
  } 

  function toNumbers(digits, spaces) {
    let expr = "";
    for (let i = 0; i < digits.length; i++) {
      if (spaces.has(i)) expr += ' ';
      expr += digits[i];
    }
    
    let numbers = expr.split(' ').map(function (it) {return parseInt(it); });
    return numbers;
  }

  function isOp(op) {
    return op == '-' || op == '+' || op == '*' || op == '/' || op == '^';
  }

  function orderInsensitive(op) {
    return op == '+' || op == '*';
  }

  function evalPostfix(expr, exprLength) {
    stackIdx = 0;

    for (let i = 0; i < exprLength; i++) {
      let current = expr[i];
      if (isOp(current)) {
        let right = stack[--stackIdx];
        let left = stack[--stackIdx];
        let value = 0;
        switch (current) {
          case '+':
            value = left + right;
            break;
          case '-':
            value = left - right;
            break;
          case '*':
            value = left * right;
            break;
          case "/":
            value = left / right;
            break;
          case "^":
            value = Math.pow(left, right);
            break;
          default:
            throw "bad";
        }
        stack[stackIdx++] = value;
      } else {
        stack[stackIdx++] = current;
      }
    }

    let s = stack[--stackIdx];
    if (stackIdx > 0) {
      print("ERROR: " + expr + " : " + exprLength);
      return NaN;
    }
    return s;
  }

  function toInfix(expr, exprLength, normalize) {
    let stack = [];

    for (let i = 0; i < exprLength; i++) {
      let current = expr[i];
      if (isOp(current)) {
        let right = stack.pop();
        let left = stack.pop();
        if (normalize && orderInsensitive(current) && left > right) {
          let tmp = left;
          left = right;
          right = tmp;
        }
        stack.push("(" + left + current + right + ")");
      } else {
        stack.push(current);
      }
    }

    let s = stack.pop();
    if (stack.length > 0) {
      print("ERROR: " + expr);
      return null;
    }
    return s;
  }

  function toJsExpr(expr) {
    let stack = [];

    for (let i = 0; i < expr.length; i++) {
      let current = expr[i];
      if (isOp(current)) {
        let right = stack.pop();
        let left = stack.pop();
        if (orderInsensitive(current) && left > right) {
          let tmp = left;
          left = right;
          right = tmp;
        }
        if (current == '^') stack.push("Math.pow(" + left + ", " + right + ")");
        else stack.push("(" + left + current + right + ")");
      } else {
        stack.push(current);
      }
    }

    let s = stack.pop();
    if (stack.length > 0) throw "bad";
    return s;
  }
 
  function simplify(initialExpr) {
    let expr = initialExpr.replace(/(^\()|(\)$)/g, "");

    do {
      prevExpr = expr;

      // (a ? b) +/- (c ^- d) === a ? b +/- c ^- d
      expr = expr.replace(/\(([^()]+)\)(\+|-)\(([^()-]+)\)/, "$1$2$3");
      expr = expr.replace(/-\(([^()]+)\)/, function(match, p1) {
        return "-" + p1.replace(/-|\+/, function(match) { return match  == '-' ? '+' : '-'; });
      });

      // (a+b)+-c === a+b+-c
      // (a*b)+-c === a*b+-c
      // (a/b)+-c === a/b+-c
      // (a-b)+-c === a-b+-c
      expr = expr.replace(/\(([^()]+)\)(\+|-[^()]+)/, "$1$2");
      expr = expr.replace(/([^()]+)\+\(([^()]+)\)/, "$1+$2");
      expr = expr.replace(/([^()]+)-\(([^()-]+)\)/, "$1-$2");

      // (...)*+-(a*/b) === (...)*+-a*/b
      expr  = expr.replace(/(\)|\d)(\*|\+|-)\(([0-9*/]+)\)/, "$1$2$3");
      // (a*/b)*+-(...) === a*/b*+-(...)
      expr  = expr.replace(/\(([0-9*/]+)\)(\*|\+|-)(\(|\d)/, "$1$2$3");

    } while (prevExpr != expr);

    return expr;
  }
}

if (arguments && arguments.length >= 3) {
  findExpr2(arguments[0].split(/\s+/), parseInt(arguments[1]), arguments[2].split(''), arguments[3] == 'group');
} else {
  // findExpr2([8, 8, 8, 8, 8, 8, 8, 8], 1000, ['+', '-', '*', '/'], true);
  findExpr2([1, 2, 3, 4, 5], 40, ['+', '-', '*', '/', '^'], true);
  // findExpr2([1, 2, 3, 4, 5], 123, ['+', '-', '*', '/', '^'], true);
  // findExpr2([1, 1, 1, 1, 1, 1, 1, 1], 999, ['+', '-', '*', '/'], true);
}