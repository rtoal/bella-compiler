// These are the entities of the Bella language, produced by the analyzer.
// The classes do not have analyze, optimize, or generate methods, because
// we prefer to keep the analyzer, optimizer, and generator separate.

export class Program {
  constructor(statements) {
    this.statements = statements
  }
}

export class VariableDeclaration {
  constructor(variable, initializer) {
    Object.assign(this, { variable, initializer })
  }
}

export class FunctionDeclaration {
  constructor(fun, body) {
    Object.assign(this, { fun, body })
  }
}

export class Assignment {
  constructor(target, source) {
    Object.assign(this, { target, source })
  }
}

export class WhileStatement {
  constructor(test, body) {
    Object.assign(this, { test, body })
  }
}

export class PrintStatement {
  constructor(argument) {
    Object.assign(this, { argument })
  }
}

export class Call {
  constructor(callee, args) {
    Object.assign(this, { callee, args, type: callee.type })
  }
}

export class Conditional {
  constructor(test, consequent, alternate) {
    const type = consequent.type
    Object.assign(this, { test, consequent, alternate, type })
  }
}

export class BinaryExpression {
  constructor(op, left, right) {
    const booleanProducers = ["||", "&&", "<", "<=", "==", "!=", ">", ">="]
    const type = booleanProducers.includes(op) ? "boolean" : "number"
    Object.assign(this, { op, left, right, type })
  }
}

export class UnaryExpression {
  constructor(op, operand) {
    const type = op === "!" ? "boolean" : "number"
    Object.assign(this, { op, operand, type })
  }
}

export class Variable {
  constructor(name, type) {
    Object.assign(this, { name, type })
  }
}

export class Function {
  constructor(name, params, type) {
    Object.assign(this, { name, params, type })
  }
}

// We don't need to create our own classes for Numeric and Boolean literals,
// We'll just be using JavaScript's numbers and booleans. Since we want them
// to have a type property, will do some controversial monkey-patching.
Number.prototype.type = "number"
Boolean.prototype.type = "boolean"
