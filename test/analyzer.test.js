import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

const semanticChecks = [
  ["variables can be printed", "let x = 1; print x;"],
  ["variables can be reassigned", "let x = 1; x = x * 5 / ((-3) + x);"],
]

const semanticErrors = [
  ["using undeclared identifiers", "print(x);", /Identifier x not declared/],
  ["a variable used as function", "x = 1; x(2);", /Expected "="/],
  [
    "a function used as variable",
    "func f() = 0; print(f + 1);",
    /Functions can not appear here/,
  ],
  [
    "re-declared identifier",
    "let x = 1; let x = 2;",
    /Identifier x already declared/,
  ],
  [
    "too few arguments",
    "func f(x) = 0; print(f());",
    /1 argument\(s\) required but 0 passed/,
  ],
  [
    "too many arguments",
    "func f(x) = 0; print(f(1, 2));",
    /1 argument\(s\) required but 2 passed/,
  ],
]

const sample = "let x=3;func f(x)=3*x;while(true){x=3;print(0?f(x):2);}"

describe("The analyzer", () => {
  for (const [scenario, source] of semanticChecks) {
    it(`recognizes ${scenario}`, () => {
      assert.ok(analyze(parse(source)))
    })
  }
  for (const [scenario, source, errorMessagePattern] of semanticErrors) {
    it(`throws on ${scenario}`, () => {
      assert.throws(() => analyze(parse(source)), errorMessagePattern)
    })
  }
  it(`produces the expected graph for the simple sample program`, () => {
    const program = analyze(parse(sample))
    let x = new core.Variable("x", false)
    let f = new core.Function("f", 1)
    let localX = new core.Variable("x", true)
    assert.deepEqual(
      program,
      new core.Program([
        new core.VariableDeclaration(x, 3),
        new core.FunctionDeclaration(
          f,
          [localX],
          new core.BinaryExpression("*", 3, localX)
        ),
        new core.WhileStatement(true, [
          new core.Assignment(x, 3),
          new core.PrintStatement(
            new core.Conditional(0, new core.Call(f, [x]), 2)
          ),
        ]),
      ])
    )
  })
})
