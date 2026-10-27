(function (root, factory) {
  const solver = factory();
  if (typeof module === "object" && module.exports) module.exports = solver;
  if (root) root.CalculatorSolver = solver;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function tokenize(expression) {
    const tokens = [];
    const pattern = /\s*([0-9]+(?:\.[0-9]*)?(?:e[+-]?[0-9]+)?|\.[0-9]+(?:e[+-]?[0-9]+)?|[a-z]+|[()+\-*/^%,])/iy;
    let position = 0;
    while (position < expression.length) {
      pattern.lastIndex = position;
      const match = pattern.exec(expression);
      if (!match) throw new Error("Unrecognized expression");
      tokens.push(match[1].toLowerCase());
      position = pattern.lastIndex;
    }
    return tokens;
  }

  function evaluate(expression, variableValue) {
    const tokens = tokenize(expression);
    let index = 0;
    const peek = () => tokens[index];
    const take = () => tokens[index++];
    const finite = (value) => {
      if (!Number.isFinite(value)) throw new Error("Result is not a finite number");
      return value;
    };

    function primary() {
      const token = take();
      if (token === undefined) throw new Error("Incomplete expression");
      let value;
      if (token === "(") {
        value = addSub();
        if (take() !== ")") throw new Error("Missing closing parenthesis");
      } else if (token === "+" || token === "-") {
        return finite((token === "-" ? -1 : 1) * primary());
      } else if (/^(?:\d|\.)/.test(token)) {
        value = Number(token);
      } else if (token === "pi" || token === "π") {
        value = Math.PI;
      } else if (token === "e") {
        value = Math.E;
      } else if (token === "x") {
        if (variableValue === undefined) throw new Error("Equation variable outside solver");
        value = variableValue;
      } else if (["sqrt", "abs", "sin", "cos", "tan", "log", "ln"].includes(token)) {
        const hasParentheses = peek() === "(";
        if (hasParentheses) take();
        const argument = addSub();
        if (hasParentheses && take() !== ")") throw new Error("Missing closing parenthesis");
        const functions = {
          sqrt: Math.sqrt,
          abs: Math.abs,
          sin: (number) => Math.sin(number * Math.PI / 180),
          cos: (number) => Math.cos(number * Math.PI / 180),
          tan: (number) => Math.tan(number * Math.PI / 180),
          log: Math.log10,
          ln: Math.log,
        };
        value = functions[token](argument);
      } else {
        throw new Error("Unsupported expression");
      }
      while (peek() === "%") {
        take();
        value /= 100;
      }
      return finite(value);
    }

    function power() {
      const base = primary();
      return peek() === "^" ? (take(), finite(base ** unary())) : base;
    }

    function unary() {
      if (peek() === "+" || peek() === "-") {
        const sign = take() === "-" ? -1 : 1;
        return finite(sign * unary());
      }
      return power();
    }

    function multiplyDivide() {
      let value = unary();
      while (peek() === "*" || peek() === "/") {
        const operator = take();
        const right = unary();
        if (operator === "/" && right === 0) throw new Error("Cannot divide by zero");
        value = finite(operator === "*" ? value * right : value / right);
      }
      return value;
    }

    function addSub() {
      let value = multiplyDivide();
      while (peek() === "+" || peek() === "-") {
        const operator = take();
        const right = multiplyDivide();
        value = finite(operator === "+" ? value + right : value - right);
      }
      return value;
    }

    const result = addSub();
    if (index !== tokens.length) throw new Error("Unexpected text in expression");
    return result;
  }

  function formatNumber(value) {
    if (Object.is(value, -0) || Math.abs(value) < 1e-14) value = 0;
    if (Number.isInteger(value) && Math.abs(value) < 1e15) return new Intl.NumberFormat("en-US").format(value);
    return Number(value.toPrecision(12)).toString();
  }

  function statistics(input) {
    const match = /\b(mean|average|median|mode|range|standard deviation|std dev)\b/i.exec(input);
    if (!match) return null;
    const values = (input.replace(match[0], "").match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const type = match[0].toLowerCase();
    if (values.length < 1 || (type !== "mean" && type !== "average" && values.length < 2)) return null;
    const sorted = [...values].sort((a, b) => a - b);
    let value;
    let label;
    if (type === "mean" || type === "average") {
      value = values.reduce((sum, item) => sum + item, 0) / values.length;
      label = "Mean";
    } else if (type === "median") {
      value = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      label = "Median";
    } else if (type === "range") {
      value = sorted[sorted.length - 1] - sorted[0];
      label = "Range";
    } else if (type === "mode") {
      const counts = new Map();
      values.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
      const highest = Math.max(...counts.values());
      if (highest === 1) return null;
      value = [...counts].filter(([, count]) => count === highest).map(([item]) => item).join(", ");
      label = "Mode";
    } else {
      const average = values.reduce((sum, item) => sum + item, 0) / values.length;
      value = formatNumber(Math.sqrt(values.reduce((sum, item) => sum + (item - average) ** 2, 0) / values.length));
      label = "Population standard deviation";
    }
    const display = typeof value === "number" ? formatNumber(value) : value;
    return { value: display, explanation: `${label} of ${values.map(formatNumber).join(", ")} = ${display}`, numeric: true };
  }

  function compoundInterest(input) {
    if (!/\bcompound(?:ed|ing)?\b/i.test(input)) return null;
    const match = input.match(/\$?([\d,]+(?:\.\d+)?)\s+(?:at\s+)?([\d.]+)\s*%\s*(?:annual(?:ly)?\s*)?(?:interest\s*)?(?:for\s*)([\d.]+)\s*years?\b/i);
    if (!match) return null;
    const principal = Number(match[1].replace(/,/g, ""));
    const rate = Number(match[2]) / 100;
    const years = Number(match[3]);
    const frequencyMatch = input.match(/\bcompounded\s+(daily|weekly|monthly|quarterly|semiannually|semi-annually|annually|yearly)\b/i);
    const frequency = frequencyMatch ? frequencyMatch[1].toLowerCase() : "yearly";
    const periods = { daily: 365, weekly: 52, monthly: 12, quarterly: 4, semiannually: 2, "semi-annually": 2, annually: 1, yearly: 1 }[frequency];
    if (!Number.isFinite(principal) || !Number.isFinite(rate) || !Number.isFinite(years) || principal < 0 || years < 0) return null;
    const amount = principal * (1 + rate / periods) ** (periods * years);
    if (!Number.isFinite(amount)) return null;
    const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
    const balance = currency.format(amount);
    const interest = currency.format(amount - principal);
    const cadence = frequency === "semiannually" || frequency === "semi-annually" ? "semi-annually" : frequency;
    return {
      value: balance,
      explanation: `After ${formatNumber(years)} years at ${formatNumber(rate * 100)}% compounded ${cadence}, ${currency.format(principal)} grows to ${balance} (interest earned: ${interest}).`,
      numeric: true,
    };
  }

  function elevationProblem(input) {
    if (!/\b(?:elevation|above the earth|above the ground)\b/i.test(input)) return null;
    const angleMatch = input.match(/angle\s+of\s+([\d.]+)\s*(?:degrees?|°)/i);
    const distanceMatch = input.match(/([\d.]+)\s*(mm|cm|m|inches|inch|in|feet|foot|ft)\s*(?:far\s*(?:away|way)?\s*)?from\s+the\s+(?:foot|base)\s+of\s+(?:the\s+)?tree\b/i);
    if (!angleMatch || !distanceMatch) return null;
    const angle = Number(angleMatch[1]);
    const unitFactors = { mm: 0.1, cm: 1, m: 100, inches: 2.54, inch: 2.54, in: 2.54, feet: 30.48, foot: 30.48, ft: 30.48 };
    const distance = Number(distanceMatch[1]) * unitFactors[distanceMatch[2].toLowerCase()];
    if (!Number.isFinite(angle) || angle <= 0 || angle >= 90 || !Number.isFinite(distance) || distance <= 0) return null;
    const radians = angle * Math.PI / 180;
    const slantDistance = distance / Math.cos(radians);
    const riseFromAngle = distance * Math.tan(radians);
    const manMatch = input.match(/height\s+of\s+(?:the\s+)?man\s+(?:is|of)\s*([\d.]+)\s*(mm|cm|m|inches|inch|in|feet|foot|ft)\b/i);
    const treeMatch = input.match(/height\s+of\s+(?:the\s+)?tree\s+(?:is|of)\s*([\d.]+)\s*(mm|cm|m|inches|inch|in|feet|foot|ft)\b/i);
    const formatCentimeters = (value) => `${formatNumber(Number(value.toFixed(2)))} cm`;
    const displayAngle = formatNumber(Number(angle.toFixed(2)));
    const expectedDistance = formatCentimeters(slantDistance);
    let explanation = `Using the ${displayAngle}° elevation angle and ${formatCentimeters(distance)}, the eye-to-bird distance is ${expectedDistance} (horizontal distance ÷ cos ${displayAngle}°).`;
    if (manMatch && treeMatch) {
      const manHeight = Number(manMatch[1]) * unitFactors[manMatch[2].toLowerCase()];
      const treeHeight = Number(treeMatch[1]) * unitFactors[treeMatch[2].toLowerCase()];
      const riseFromHeights = treeHeight - manHeight;
      const angleFromHeights = Math.atan2(riseFromHeights, distance) * 180 / Math.PI;
      const distanceFromHeights = Math.hypot(distance, riseFromHeights);
      const difference = Math.abs(riseFromHeights - riseFromAngle);
      if (difference > 0.5) {
        explanation = `The givens conflict if the bird is at the tree top and the man's eyes are at his stated height. The ${displayAngle}° angle and ${formatCentimeters(distance)} horizontal distance give an eye-to-bird distance of ${expectedDistance}, with a vertical rise of ${formatCentimeters(riseFromAngle)}. But the stated heights (${formatCentimeters(manHeight)} eye level and ${formatCentimeters(treeHeight)} tree) imply a ${formatNumber(Number(angleFromHeights.toFixed(2)))}° angle and a distance of ${formatCentimeters(distanceFromHeights)}. The ${displayAngle}° result would put the bird at about ${formatCentimeters(manHeight + riseFromAngle)}.`;
      }
    }
    return { value: expectedDistance, explanation, numeric: false };
  }

  function normalize(input) {
    let expression = input.toLowerCase().trim()
      .replace(/[,$]/g, "").replace(/[×·]/g, "*").replace(/[÷]/g, "/").replace(/[−–]/g, "-").replace(/\?/g, "")
      .replace(/\b(?:what is|what's|calculate|compute|evaluate|please|solve)\b/g, " ").trim()
      .replace(/\b(?:square root of|square root)\s*/g, "sqrt ")
      .replace(/\b(sqrt|sin|cos|tan|log|ln|abs)\s+(\d+(?:\.\d+)?)/g, "$1($2)");
    const percentOf = expression.match(/^\s*(-?\d+(?:\.\d+)?)\s*%\s*(?:of|from)\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (percentOf) expression = `(${percentOf[1]}/100)*(${percentOf[2]})`;
    const words = { plus: "+", minus: "-", times: "*", multiplied: "*", over: "/", divided: "/" };
    for (const [word, symbol] of Object.entries(words)) expression = expression.replace(new RegExp(`\\b${word}(?: by)?\\b`, "g"), symbol);
    return expression.replace(/\s+/g, "");
  }

  function solve(input) {
    if (typeof input !== "string" || !input.trim()) return null;
    const summary = statistics(input);
    if (summary) return summary;
    const interest = compoundInterest(input);
    if (interest) return interest;
    const elevation = elevationProblem(input);
    if (elevation) return elevation;
    try {
      let equation = input.toLowerCase().replace(/\b(?:solve|please)\b/g, "").replace(/[×·]/g, "*").replace(/[÷]/g, "/").replace(/[−–]/g, "-").replace(/\s+/g, "");
      equation = equation.replace(/(\d)x\b/g, "$1*x");
      if (equation.includes("=") && equation.split("=").length === 2 && /x/i.test(equation) && /^[0-9xpi e.+*/^()%=-]+$/i.test(equation)) {
        const [left, right] = equation.split("=");
        const difference = (value) => evaluate(left, value) - evaluate(right, value);
        const intercept = difference(0);
        const slope = difference(1) - intercept;
        const tolerance = 1e-9 * Math.max(1, Math.abs(intercept), Math.abs(slope));
        if (Math.abs(difference(2) - (intercept + 2 * slope)) > tolerance || Math.abs(slope) < 1e-14) return null;
        const result = formatNumber(-intercept / slope);
        return { value: `x = ${result}`, explanation: `Solving ${left} = ${right} gives x = ${result}`, numeric: true };
      }
      const expression = normalize(input).replace(/π/g, "pi");
      if (!expression || !/^[0-9a-z().+*/^%,-]+$/i.test(expression)) return null;
      const result = formatNumber(evaluate(expression));
      return { value: result, explanation: result, numeric: true };
    } catch {
      return null;
    }
  }

  return { solve, evaluate, formatNumber };
});