importScripts(
  "workerp.js"
);

function calculate(numbers, EXPECTED, OPS) {
  let opsMap = new Map();
  let opsCount = 0;
  let found = new Map();
  let foundExprs = [];

  tryOps(numbers, opsMap, opsCount);

  return foundExprs;

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
    let expr = [];
    for (let i = 0; i < numbers.length; i++) {
      expr.push(numbers[i]);
      if (opsMap.has(i)) {
        let ops = opsMap.get(i);
        for (let j = 0; j < ops.length; j++) {
          expr.push(ops[j]);
        }
      }
    }

    let res = evalPostfix(expr);

    if (res == EXPECTED) {
      let exprStr = simplify(toInfix(expr, true));
      if (!found.has(exprStr)) {
        found.set(exprStr, true);
        foundExprs.push(simplify(toInfix(expr, false)));
      }
    }
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

Workerp.message(function ({numbers, EXPECTED, OPS}) {
  return Promise.resolve(calculate(numbers, EXPECTED, OPS));
});