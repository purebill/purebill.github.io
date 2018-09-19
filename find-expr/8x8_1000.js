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

      if (totalTries % 1000 == 0) {
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

function findExpr2(digits, EXPECTED, OPS) {
  let found = new Map();
  let foundIdx = 1;
  let exprMetrics = Metrics("tries");

  trySpaces(digits, new Map());
  exprMetrics.total();

  function trySpaces(digits, spaces) {
    tryOps(toNumbers(digits, spaces), new Map(), 0);
    
    for (let i = 1; i < digits.length; i++) {
      if (!spaces.has(i)) {
        spaces.set(i, true);
        trySpaces(digits, spaces);
        spaces.delete(i);
      }
    }
  }

  function tryOps(numbers, opsMap, opsCount) {
    if (opsCount > numbers.length - 1) return;

    if (opsCount == numbers.length - 1) {
      evalAndCheck(numbers, opsMap);
      return;
    }

    for (let idx = numbers.length; idx > 0; idx--) {
      for (let i = 0; i < OPS.length; i++) {
        let op = OPS[i];
      
        opsMap.has(idx) ? opsMap.get(idx).push(op) : opsMap.set(idx, [op]);
        tryOps(numbers, opsMap, opsCount + 1);
        opsMap.get(idx).pop();
      }
    }
  }

  function evalAndCheck(numbers, opsMap) {
    let expr = [];
    for (let i = 0; i < numbers.length; i++) {
      expr.push(numbers[i]);
      if (opsMap.has(i)) opsMap.get(i).forEach(function (it) {expr.push(it);} );
    }

    exprMetrics.tick(1);

    // let res = eval(toJsExpr(expr));
    let res = evalPostfix(expr);

    if (res == EXPECTED) {
      let exprStr = simplify(toInfix(expr, true));
      if (!found.has(exprStr)) {
        found.set(exprStr, foundIdx);
        print(foundIdx + ". " + simplify(toInfix(expr, false)) + " = " + EXPECTED + "                                                                            ");
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

  function evalPostfix(expr) {  
    let stack = [];

    for (let i = 0; i < expr.length; i++) {
      let current = expr[i];
      if (isOp(current)) {
        let right = stack.pop();
        let left = stack.pop();
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
        stack.push(value);
      } else {
        stack.push(current);
      }
    }

    let s = stack.pop();
    if (stack.length > 0) return NaN;
    return s;
  }

  function toInfix(expr, normalize) {
    let stack = [];

    for (let i = 0; i < expr.length; i++) {
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
    if (stack.length > 0) return null;
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
 
  function simplify(expr) {
    return expr.replace(/(^\()|(\)$)/g, "");
  }
}

// findExpr2([8, 8, 8, 8, 8, 8, 8, 8], 1000, ['+', '-', '*', '/']);
findExpr2([1, 2, 3, 4, 5], 40, ['+', '-', '*', '/', '^']);
// findExpr2([1, 2, 3, 4, 5], 123, ['+', '-', '*', '/', '^']);

//findExpr([1, 1, 1, 1, 1, 1, 1, 1], 999, ['+', '-', '*', '/']);

/*for (let i = 100; i < 1000; i++) {
  //findExpr([1, 1, 1, 1, 1, 1, 1, 1], i, ['+', '-', '*', '/']);
  findExpr([1, 2, 3, 4, 5], i, ['+', '-', '*', '/']);
  //findExpr([8, 8, 8, 8, 8, 8, 8, 8], 1000, ['+', '-', '*', '/']);
}
*/