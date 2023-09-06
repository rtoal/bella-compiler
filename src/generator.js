import * as core from "./core.js"

export default function generate(program) {
  // Variable names in JS will be suffixed with _1, _2, _3, etc. This is
  // because "for", for example, is a legal variable name in Bella, but
  // not in JS. So we want to generate something like "for_1". We handle
  // this by mapping each variable declaration to its suffix.
  return program.gen({
    targetName: ((mapping) => {
      return (entity) => {
        if (!mapping.has(entity)) {
          mapping.set(entity, mapping.size + 1)
        }
        return `${entity.name}_${mapping.get(entity)}`
      }
    })(new Map()),
  })
}

core.Program.prototype.gen = function (c) {
  return this.statements.gen(c).join("\n")
}
core.VariableDeclaration.prototype.gen = function (c) {
  return `let ${this.variable.gen(c)} = ${this.initializer.gen(c)};`
}
core.Variable.prototype.gen = function (c) {
  return c.targetName(this)
}
core.FunctionDeclaration.prototype.gen = function (c) {
  const params = this.params.map((n) => c.targetName(n)).join(", ")
  return [
    `function ${this.fun.gen(c)}(${params}) {`,
    `return ${this.body.gen(c)};`,
    "}",
  ].join("\n")
}
core.Function.prototype.gen = function (c) {
  return c.targetName(this)
}
core.PrintStatement.prototype.gen = function (c) {
  return `console.log(${this.argument.gen(c)});`
}
core.Assignment.prototype.gen = function (c) {
  return `${this.target.gen(c)} = ${this.source.gen(c)};`
}
core.WhileStatement.prototype.gen = function (c) {
  return [`while (${this.test.gen(c)}) {`, ...this.body.gen(c), "}"].join("\n")
}
core.Call.prototype.gen = function (c) {
  return `${this.callee.gen(c)}(${this.args.gen(c)})`
}
core.Conditional.prototype.gen = function (c) {
  return `((${this.test.gen(c)}) ? (${this.consequent.gen(
    c
  )}) : (${this.alternate.gen(c)}))`
}
core.BinaryExpression.prototype.gen = function (c) {
  return `(${this.left.gen(c)} ${this.op} ${this.right.gen(c)})`
}
core.UnaryExpression.prototype.gen = function (c) {
  return `${this.op}(${this.operand.gen(c)})`
}
Number.prototype.gen = function (c) {
  return this
}
Boolean.prototype.gen = function (c) {
  return this
}
Array.prototype.gen = function (c) {
  return this.map((element) => element.gen(c))
}
