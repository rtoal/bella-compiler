import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import * as core from "../src/core.js"

const semanticChecks = [
  ["can infer types", "let x = 1; let y = x > 3;"],
  ["variables can be printed", "let x = 1; let y = 1 > 3; print x; print y;"],
  ["variables can be reassigned", "let x = 1; x = x * 5 / ((-3) + x);"],
  ["can infer function tyoe", "func f(x) = f(x-1) * 2; print(f(3));"],
]

const semanticErrors = [
  ["using undeclared identifiers", "print(x);", /x has not been declared/],
  ["a variable used as function", "x = 1; x(2);", /Expected "="/],
  [
    "a function used as variable",
    "func f() = 0; print(f + 1);",
    /f is not a Variable/,
  ],
  ["re-declared identifier", "let x = 1; let x = 2;", /x already declared/],
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
  ["cannot infer", "func f(x) = f(x);", /Cannot infer types/],
]

const sample = "let x=3;func f(x)=3*x;while(true){x=3;print(false?f(x):2);}"

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
    let x = new core.Variable("x", "number")
    let localX = new core.Variable("x", "number")
    let f = new core.Function("f", [localX], "number")
    assert.deepEqual(
      program,
      new core.Program([
        new core.VariableDeclaration(x, 3),
        new core.FunctionDeclaration(
          f,
          new core.BinaryExpression("*", 3, localX)
        ),
        new core.WhileStatement(true, [
          new core.Assignment(x, 3),
          new core.PrintStatement(
            new core.Conditional(false, new core.Call(f, [x]), 2)
          ),
        ]),
      ])
    )
  })
})
