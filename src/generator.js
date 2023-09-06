import * as core from "./core.js"

export default function generate(program) {
  const output = []

  // Variable names in JS will be suffixed with _1, _2, _3, etc. This is
  // because "for", for example, is a legal variable name in Bella, but
  // not in JS. So we want to generate something like "for_1". We handle
  // this by mapping each variable declaration to its suffix.
  const targetName = ((mapping) => {
    return (entity) => {
      if (!mapping.has(entity)) {
        mapping.set(entity, mapping.size + 1)
      }
      return `${entity.name}_${mapping.get(entity)}`
    }
  })(new Map())

  core.Program.prototype.gen = function () {
    this.statements.gen()
  }
  core.VariableDeclaration.prototype.gen = function () {
    output.push(`let ${this.variable.gen()} = ${this.initializer.gen()};`)
  }
  core.Variable.prototype.gen = function () {
    return targetName(this)
  }
  core.FunctionDeclaration.prototype.gen = function () {
    const params = this.params.map(targetName).join(", ")
    output.push(`function ${this.fun.gen()}(${params}) {`)
    output.push(`return ${this.body.gen()};`)
    output.push("}")
  }
  core.Function.prototype.gen = function () {
    return targetName(this)
  }
  core.PrintStatement.prototype.gen = function () {
    output.push(`console.log(${this.argument.gen()});`)
  }
  core.Assignment.prototype.gen = function () {
    output.push(`${this.target.gen()} = ${this.source.gen()};`)
  }
  core.WhileStatement.prototype.gen = function () {
    output.push(`while (${this.test.gen()}) {`)
    this.body.gen()
    output.push("}")
  }
  core.Call.prototype.gen = function () {
    return `${this.callee.gen()}(${this.args.gen()})`
  }
  core.Conditional.prototype.gen = function () {
    return `((${this.test.gen()}) ? (${this.consequent.gen()}) : (${this.alternate.gen()}))`
  }
  core.BinaryExpression.prototype.gen = function () {
    return `(${this.left.gen()} ${this.op} ${this.right.gen()})`
  }
  core.UnaryExpression.prototype.gen = function () {
    return `${this.op}(${this.operand.gen()})`
  }
  Number.prototype.gen = function () {
    return this
  }
  Boolean.prototype.gen = function () {
    return this
  }
  Array.prototype.gen = function () {
    return this.map((element) => element.gen())
  }

  program.gen()
  return output.join("\n")
}
