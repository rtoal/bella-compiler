import assert from "node:assert/strict"
import parse from "../src/parser.js"
import analyze from "../src/analyzer.js"
import optimize from "../src/optimizer.js"
import * as core from "../src/core.js"

// Make some test cases easier to read
const x = new core.Variable("x", "number")
const neg = (x) => new core.UnaryExpression("-", x)
const power = (x, y) => new core.BinaryExpression("**", x, y)
const greater = (x, y) => new core.BinaryExpression(">", x, y)
const cond = (x, y, z) => new core.Conditional(x, y, z)
const call = (f, args) => new core.Call(f, args)
const letXEq1 = new core.VariableDeclaration(x, 1)
const print = (e) => new core.PrintStatement(e)
const parameterless = (name) => new core.Function(name, [], "number")
const oneParamFunc = new core.Function("f", [x], "number")
const program = (p) => analyze(parse(p))
const expression = (e) =>
  program(`let x=1; func f(x)=x+1; print ${e};`).statements[2].argument

const tests = [
  ["folds +", expression("5 + 8"), 13],
  ["folds -", expression("5 - 8"), -3],
  ["folds *", expression("5 * 8"), 40],
  ["folds /", expression("5 / 8"), 0.625],
  ["folds %", expression("17 % 5"), 2],
  ["folds **", expression("5 ** 8"), 390625],
  ["optimizes +0", expression("x + 0"), x],
  ["optimizes -0", expression("x - 0"), x],
  ["optimizes *1", expression("x * 1"), x],
  ["optimizes /1", expression("x / 1"), x],
  ["optimizes *0", expression("x * 0"), 0],
  ["optimizes 0*", expression("0 * x"), 0],
  ["optimizes 0/", expression("0 / x"), 0],
  ["optimizes 0+", expression("0 + x"), x],
  ["optimizes 0-", expression("0 - x"), neg(x)],
  ["optimizes 1*", expression("1 * x"), x],
  ["folds negation", expression("- 8"), -8],
  ["folds not", expression("! false"), true],
  ["optimizes 1**", expression("1 ** x"), 1],
  ["optimizes **0", expression("x ** 0"), 1],
  ["optimizes deeply", expression("8 * (-5) + 2 ** 3"), -32],
  ["optimizes arguments", expression("f(20 + 61)"), call(oneParamFunc, [81])],
  ["optimizes true conditionals", expression("true?3:5"), 3],
  ["optimizes false conditionals", expression("false?3:5"), 5],
  ["leaves nonoptimizable binaries alone", expression("x ** 5"), power(x, 5)],
  [
    "leaves nonoptimizable conditionals alone",
    expression("x > 3?1:2"),
    cond(greater(x, 3), 1, 2),
  ],
  [
    "leaves nonoptimizable calls alone",
    call(oneParamFunc, [x]),
    call(oneParamFunc, [x]),
  ],
  ["leaves nonoptimizable negations alone", expression("-x"), neg(x)],
  [
    "optimizes in function body",
    program("func f() = 1+1;"),
    new core.Program([new core.FunctionDeclaration(parameterless("f"), 2)]),
  ],
  [
    "removes x=x",
    program("let x=1; x=x; print(x);"),
    new core.Program([letXEq1, print(x)]),
  ],
  [
    "optimizes while test",
    program("while 1<2 {}"),
    new core.Program([new core.WhileStatement(true, [])]),
  ],
]

describe("The optimizer", () => {
  for (const [scenario, before, after] of tests) {
    it(`${scenario}`, () => {
      assert.deepEqual(optimize(before), after)
    })
  }
})
