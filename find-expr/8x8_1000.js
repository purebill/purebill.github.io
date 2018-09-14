function Metrics(name) {
	let System = Java.type("java.lang.System");

	let totalTries = 0;
	let tries = 0;
	let lastTime = System.currentTimeMillis();
	let lastSpeed = 0;

	return {
		reset: function () {
			totalTries = 0;
			tries = 0;
			lastTime = System.currentTimeMillis();
			lastSpeed = 0;
		},
		tick: function () {
			tries++;
			totalTries++;

			if (totalTries % 1000 == 0) {
				let currentTime = System.currentTimeMillis();
				let currentSpeed = tries / (currentTime - lastTime) * 1000;
				let avgSpeed = (lastSpeed + currentSpeed) / 2;
				lastSpeed = avgSpeed;
				System.out.print(name + ": " + totalTries + ". " + Math.round(avgSpeed) + " " + name + "/sec.                                       \r");

				lastTime = System.currentTimeMillis();
				tries = 0;
			}
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


function findExpr(digits, EXPECTED, OPS) {
	let found = new Map();
	tryOps(digits, new Map());

	function tryOps(digits, ops) {
		evalAndCheck(digits, ops);

		for (let i = 0; i < OPS.length; i++) {
			let op = OPS[i];
			for (let i = 1; i < digits.length; i++) {
				if (!ops.has(i)) {
					ops.set(i, op);
					tryOps(digits, ops);
					ops.delete(i);
				}
			}
		}

		return false;
	}

	function evalAndCheck(digits, ops, expected) {
		let expr = "";
		for (let i = 0; i < digits.length; i++) {
			if (ops.has(i)) expr += ops.get(i);
			expr += digits[i];
		}
		try {
			let res = eval(expr);
			if (res == EXPECTED && !found.has(expr)) {
				found.set(expr, true);
				print(expr + " = " + EXPECTED);
				return true;
			}
		} catch (e) {}

		return false;
	}	
}


function findExpr2(digits, EXPECTED, OPS) {
	let found = new Map();
	let exprMetrics = Metrics("tries");
	let badExprMetrics = Metrics("errors");

	trySpaces(digits, new Map());
	// let expr = [1, 2, '*', 3, 45, '/', '/']; print(toInfix(expr), evalPostfix(expr));

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

		if (opsCount == numbers.length - 1) evalAndCheck(numbers, opsMap);

		for (let idx = numbers.length; idx > 1; idx--) {
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

		try {
			exprMetrics.tick();

			// let res = eval(toInfix(expr));
			let res = evalPostfix(expr);

			/*let res2;
			try {
				res2 = evalPostfix(expr);
			} catch (e) {
				print("ERROR", expr, res, res2);
			}
			if (res !== res2) {
				print("NO MATCH", expr, typeof(res), res, typeof(res2), res2);
				exit();
			}*/

			if (res == EXPECTED) {
				let exprStr = toInfix(expr);
				if (!found.has(exprStr)) {
					found.set(exprStr, true);
					print(exprStr + " = " + EXPECTED + "                                                                            ");
				}
			}
		} catch (e) {
			//badExprMetrics.tick();
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
		return op == '-' || op == '+' || op == '*' || op == '/';
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
					default:
						throw "bad";
				}
				stack.push(value);
			} else {
				stack.push(current);
			}
		}

		let s = stack.pop();
		if (stack.length > 0) throw "bad";
		if (typeof s == 'string') {
			print("BAD", expr);
			exit();
		}
		return s;
	}

	function toInfix(expr) {
		let stack = [];

		for (let i = 0; i < expr.length; i++) {
			let current = expr[i];
			if (isOp(current)) {
				let right = stack.pop();
				let left = stack.pop();
				stack.push("(" + left + current + right + ")");
			} else {
				stack.push(current);
			}
		}

		let s = stack.pop();
		if (stack.length > 0) throw "bad";
		return s;
	}
}

// findExpr2([8, 8, 8, 8, 8, 8, 8, 8], 1000, ['+', '-', '*', '/']);
findExpr2([1, 2, 3, 4, 5], 40, ['+', '-', '*', '/']);

//findExpr([1, 1, 1, 1, 1, 1, 1, 1], 999, ['+', '-', '*', '/']);

/*for (let i = 100; i < 1000; i++) {
	//findExpr([1, 1, 1, 1, 1, 1, 1, 1], i, ['+', '-', '*', '/']);
	findExpr([1, 2, 3, 4, 5], i, ['+', '-', '*', '/']);
	//findExpr([8, 8, 8, 8, 8, 8, 8, 8], 1000, ['+', '-', '*', '/']);
}
*/