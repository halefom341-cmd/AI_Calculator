const test = require("node:test");
const assert = require("node:assert/strict");
const solver = require("./solver.js");

test("solves arithmetic expressions and linear equations locally", () => {
  assert.equal(solver.solve("2 + 3 * 4").value, "14");
  assert.equal(solver.solve("Solve 2x + 5 = 17").value, "x = 6");
});

test("solves quadratic equations with two and repeated real roots", () => {
  assert.equal(solver.solve("Solve x^2 - 5x + 6 = 0").value, "x = 2, 3");
  assert.equal(solver.solve("Solve x^2 + 2x + 1 = 0").value, "x = -1");
});

test("converts units, including affine temperature conversions", () => {
  assert.equal(solver.solve("Convert 5 kilometers to miles").value, "3.10685596119 mi");
  assert.equal(solver.solve("Convert 32 F to C").value, "0 °C");
  assert.equal(solver.solve("Convert 1 kilometer to seconds"), null);
});

test("calculates binomial probabilities", () => {
  const result = solver.solve("What is the probability of exactly 3 successes in 10 trials with success probability 0.2?");
  assert.equal(result.value, "0.201326592");
  assert.equal(solver.solve("exactly 0 successes in 10 trials with success probability 0").value, "1");
  assert.equal(solver.solve("exactly 11 successes in 10 trials with success probability 0.2"), null);
});

test("retains existing statistics and compound-interest support", () => {
  assert.match(solver.solve("What is the average of 18, 24, 31, 27, and 40?").explanation, /28/);
  assert.match(solver.solve("If I invest $2,400 at 5% annual interest for 6 years, compounded yearly").explanation, /\$3,216\.23/);
});
