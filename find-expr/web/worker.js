importScripts(
  "workerp.js"
);

function * permutations(numbers, result, taken) {
  result = result || [];
  taken = taken || new Set();
  
  if (taken.size == numbers.length) {
    yield result;
    return;
  }

  for (let i in numbers) {
    if (taken.has(i)) continue;

    taken.add(i);
    result.push(numbers[i]);
    
    yield * permutations(numbers, result, taken);
    taken.delete(i);
    result.pop();
  }
}

function calculate(numbers, EXPECTED, OPS, permutate) {
  let opsMap = new Map();
  let opsCount = 0;
  let found = new Map();
  let foundExprs = [];

  // reuse the same arrays for expr and stack for performance sake
  let expr = [];
  let exprIdx = 0;
  let stack = [];
  let stackIdx = 0;

  if (permutate) {
    for (let permutation of permutations(numbers)) {
      tryOps(permutation, opsMap, 1, opsCount);
    }
  } else {
    tryOps(numbers, opsMap, 1, opsCount);
  }

  return foundExprs;

  function tryOps(numbers, opsMap, startIdx, opsCount) {
    if (opsCount > numbers.length - 1) return;

    if (opsCount == numbers.length - 1) {
      evalAndCheck(numbers, opsMap);
      return;
    }

    for (let idx = startIdx; idx < numbers.length; idx++) {
      let numbersCount = idx + 1;
      if (numbersCount <= opsCount + 1) continue;

      for (let i = 0; i < OPS.length; i++) {
        let op = OPS[i];
      
        opsMap.has(idx) ? opsMap.get(idx).push(op) : opsMap.set(idx, [op]);
        tryOps(numbers, opsMap, idx, opsCount + 1);
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

    let res = evalPostfix(expr, exprIdx);

    if (res == EXPECTED) {
      let exprStr = simplify(toInfix(expr, exprIdx, true));
      if (!found.has(exprStr)) {
        found.set(exprStr, true);
        foundExprs.push(simplify(toInfix(expr, exprIdx, false)));
      }
    }
  } 

  function isOp(op) {
    return op == '-' || op == '+' || op == '*' || op == '/' || op == '^' || op == 'log';
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
          case "log":
              value = almostInteger(Math.log(right) / Math.log(left));
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
      throw "ERROR: " + expr + " : " + exprLength;
    }
    return s;
  }

  function almostInteger(v) {
    if (Math.abs(v - Math.floor(v)) < 1e-6) return Math.floor(v);
    else return v;
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
        if (current == "log") stack.push("log" + left + "[" + right + "]");
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

Workerp.message(function ({numbers, EXPECTED, OPS, permutate}) {
  return Promise.resolve(calculate(numbers, EXPECTED, OPS, permutate));
});