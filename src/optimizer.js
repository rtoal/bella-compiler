import * as core from "./core.js"

export default function optimize(program) {
  return program.optimize()
}

// Includes optimizations like:
//   - assignments to self (x = x) turn into no-ops
//   - constant folding
//   - some strength reductions (+0, -0, *0, *1, etc.)
//   - Conditionals with constant tests collapse into a single arm

core.Program.prototype.optimize = function () {
  this.statements = this.statements.optimize()
  return this
}
core.VariableDeclaration.prototype.optimize = function () {
  this.initializer = this.initializer.optimize()
  return this
}
core.Variable.prototype.optimize = function () {
  return this
}
core.FunctionDeclaration.prototype.optimize = function () {
  this.params = this.params.optimize()
  this.body = this.body.optimize()
  return this
}
core.Function.prototype.optimize = function () {
  return this
}
core.Assignment.prototype.optimize = function () {
  this.source = this.source.optimize()
  this.target = this.target.optimize()
  if (this.source === this.target) {
    return null
  }
  return this
}
core.WhileStatement.prototype.optimize = function () {
  this.test = this.test.optimize()
  this.body = this.body.optimize()
  return this
}
core.PrintStatement.prototype.optimize = function () {
  this.argument = this.argument.optimize()
  return this
}
core.Call.prototype.optimize = function () {
  this.callee = this.callee.optimize()
  this.args = this.args.optimize()
  return this
}
core.Conditional.prototype.optimize = function () {
  this.test = this.test.optimize()
  this.consequent = this.consequent.optimize()
  this.alternate = this.alternate.optimize()
  if (this.test.constructor === Number || this.test.constructor === Boolean) {
    return this.test ? this.consequent : this.alternate
  }
  return this
}
core.UnaryExpression.prototype.optimize = function () {
  this.operand = this.operand.optimize()
  if (this.operand.constructor === Number) {
    if (this.op === "-") {
      return -this.operand
    }
  }
  return this
}
core.BinaryExpression.prototype.optimize = function () {
  this.left = this.left.optimize()
  this.right = this.right.optimize()
  if (this.left.constructor === Number) {
    if (this.right.constructor === Number) {
      if (this.op === "+") {
        return this.left + this.right
      } else if (this.op === "-") {
        return this.left - this.right
      } else if (this.op === "*") {
        return this.left * this.right
      } else if (this.op === "/") {
        return this.left / this.right
      } else if (this.op === "%") {
        return this.left % this.right
      } else if (this.op === "**" && this.left !== 0 && this.right !== 0) {
        return this.left ** this.right
      }
    } else if (this.left === 0 && this.op === "+") {
      return this.right
    } else if (this.left === 1 && this.op === "*") {
      return this.right
    } else if (this.left === 0 && this.op === "-") {
      return new core.UnaryExpression("-", this.right)
    } else if (this.left === 0 && ["*", "/", "%"].includes(this.op)) {
      return 0
    } else if (this.op === "**" && this.left === 1) {
      return 1
    }
  } else if (this.right.constructor === Number) {
    if (["+", "-"].includes(this.op) && this.right === 0) {
      return this.left
    } else if (["*", "/"].includes(this.op) && this.right === 1) {
      return this.left
    } else if (this.op === "*" && this.right === 0) {
      return 0
    } else if (this.op === "**" && this.left !== 0 && this.right === 0) {
      return 1
    }
  }
  return this
}
Number.prototype.optimize = function () {
  return this
}
Boolean.prototype.optimize = function () {
  return this
}
Array.prototype.optimize = function () {
  // Optimizing arrays involves flattening and removing nulls
  return this.flatMap(optimize).filter((s) => s !== null)
}
