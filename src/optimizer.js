import * as core from "./core.js"

export default function optimize(node) {
  // Dispatch to the appropriate optimizer based on the node's type.
  // If there is no appropriate optimizer, just return the node.
  // If the optimizer returns undefined, that means we just want
  // use whatever the optimizer did to the node.
  if (!(node.constructor.name in optimizers)) return node
  const optimized = optimizers[node.constructor.name](node)
  return optimized === undefined ? node : optimized
}

// A smattering of optimizations, including (1) Constant folding for
// operators (including ?:, &&, and ||), (2) Some strength reductions
// (+0, -0, *0, *1, etc.), and (3) Dead code elimination (assignments
// to self, while-false). If an optimizer returns something directly,
// that is used as the replacement for the node. If it returns null,
// that means the node should be removed. If it returns nothing, we
// just use whatever the optimizer did to the node.
const optimizers = {
  Program(p) {
    p.statements = optimize(p.statements)
  },
  VariableDeclaration(d) {
    d.initializer = optimize(d.initializer)
  },
  FunctionDeclaration(d) {
    d.body = optimize(d.body)
  },
  Assignment(s) {
    s.source = optimize(s.source)
    if (s.source === s.target) return null
  },
  WhileStatement(s) {
    s.test = optimize(s.test)
    if (s.test === false) return null
    s.body = optimize(s.body)
  },
  PrintStatement(s) {
    s.argument = optimize(s.argument)
  },
  Call(c) {
    c.callee = optimize(c.callee)
    c.args = optimize(c.args)
  },
  Conditional(c) {
    c.test = optimize(c.test)
    c.consequent = optimize(c.consequent)
    c.alternate = optimize(c.alternate)
    if (typeof c.test === "boolean") {
      return c.test ? c.consequent : c.alternate
    }
  },
  BinaryExpression(e) {
    e.left = optimize(e.left)
    e.right = optimize(e.right)
    if (typeof e.left === "number") {
      if (typeof e.right === "number") {
        // Left is a constant number, Right is a constant number
        if (e.op === "+") return e.left + e.right
        if (e.op === "-") return e.left - e.right
        if (e.op === "*") return e.left * e.right
        if (e.op === "/") return e.left / e.right
        if (e.op === "%") return e.left % e.right
        if (e.op === "**") return e.left ** e.right
        if (e.op === "<") return e.left < e.right
        if (e.op === "<=") return e.left <= e.right
        if (e.op === "==") return e.left == e.right
        if (e.op === "!=") return e.left != e.right
        if (e.op === ">=") return e.left >= e.right
        if (e.op === ">") return e.left > e.right
      } else {
        // Left is a constant number, Right is not
        if (e.left === 0 && e.op === "+") return e.right
        if (e.left === 1 && e.op === "*") return e.right
        if (e.left === 0 && e.op === "-")
          return new core.UnaryExpression("-", e.right)
        if (e.left === 0 && ["*", "/", "%"].includes(e.op)) return 0
        if (e.op === "**" && e.left === 1) return 1
      }
    } else if (typeof e.right === "number") {
      // Left is not a constant number, Right is
      if (e.op === "+" && e.right === 0) return e.left
      if (e.op === "-" && e.right === 0) return e.left
      if (e.op === "*" && e.right === 1) return e.left
      if (e.op === "/" && e.right === 1) return e.left
      if (e.op === "*" && e.right === 0) return 0
      if (e.op === "/" && e.right === 0) return Infinity
      if (e.op === "%" && e.right === 0) return NaN
      if (e.op === "**" && e.right === 1) return e.left
      if (e.op === "**" && e.right === 0) return 1
    } else if (typeof e.left === "boolean") {
      if (e.op === "||" && e.left) return true
      if (e.op === "||" && !e.left) return e.right
      if (e.op === "&&" && e.left) return e.right
      if (e.op === "&&" && !e.left) return false
    }
  },
  UnaryExpression(e) {
    e.operand = optimize(e.operand)
    if (typeof e.operand === "number") {
      if (e.op === "-") return -e.operand
    }
    if (typeof e.operand === "boolean") {
      if (e.op === "!") return !e.operand
    }
  },
  Array(a) {
    // Optimizing arrays involves flattening an removing nulls
    return a.flatMap(optimize).filter((s) => s !== null)
  },
}
