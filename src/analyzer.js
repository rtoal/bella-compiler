// The analyzer takes as input the match object produced by the parser and
// produces as output a contextually-checked program representation

import * as core from "./core.js"

// We want error messages from the analyzer to look like those automatically
// generated by Ohm in the parser. So we have a single point at which all
// contextual checks are made, and we throw an error with a message that
// looks like Ohm's. Pass in a condition that must be true, a message to
// report if the condition is false, and an object that contains contextual
// information about the error location. The object should have an "at"
// property whose value is a parse tree node. The error message will be
// prefixed with the line and column number of the parse tree node.
function check(condition, message, { at: errorLocation }) {
  if (!condition) {
    const prefix = errorLocation.source.getLineAndColumnMessage()
    throw new Error(`${prefix}${message}`)
  }
}

check.assignable = ({ from, to, at }) => {
  if (from.type === undefined) {
    if (from instanceof core.Variable) from.type = to.type
    else if (from instanceof core.Call) from.callee.type = from.type = to.type
  }
  if (to.type === undefined) {
    if (to instanceof core.Variable) to.type = from.type
    else if (to instanceof core.Call) to.callee.type = to.type = from.type
  }
  const stillBothUndefined = from.type === undefined && to.type === undefined
  check(!stillBothUndefined, `Cannot infer types`, { at })
  check(from.type === to.type, `Expected ${to.type}, got ${from.type}`, { at })
}

check.isANumber = (entity, { at }) => {
  check.assignable({ from: entity, to: { type: "number" }, at })
}

check.isABoolean = (entity, { at }) => {
  check.assignable({ from: entity, to: { type: "boolean" }, at })
}

check.bothAreNumbers = (entity1, entity2, { at }) => {
  check.isANumber(entity1, { at })
  check.isANumber(entity2, { at })
}

check.bothAreBooleans = (entity1, entity2, { at }) => {
  check.isABoolean(entity1, { at })
  check.isABoolean(entity2, { at })
}

check.correctArgCount = (argCount, paramCount, { at }) => {
  const message = `${paramCount} argument(s) required but ${argCount} passed`
  check(argCount === paramCount, message, { at })
}

class Context {
  constructor(parent) {
    this.parent = parent
    this.locals = new Map()
  }
  add(id, entity) {
    const name = id.sourceString
    check(!this.locals.has(name), `${name} already declared`, { at: id })
    this.locals.set(name, entity)
  }
  get(name) {
    return this.locals.get(name) || this.parent?.get(name)
  }
  lookup(id, { expecting: kind }) {
    const name = id.sourceString
    const entity = this.get(name)
    check(entity, `${name} has not been declared`, { at: id })
    const hasExpectedKind = entity instanceof kind
    check(hasExpectedKind, `${name} is not a ${kind.name}`, { at: id })
    return entity
  }
}

export default function analyze(match) {
  let context = new Context()

  const analyzer = match.matcher.grammar.createSemantics().addOperation("rep", {
    Program(statements) {
      return new core.Program(statements.children.map((s) => s.rep()))
    },

    Statement_vardec(_let, id, _eq, exp, _semicolon) {
      // Analyze the initializer *before* adding the variable to the context,
      // because we don't want the variable to come into scope until after
      // the declaration. That is, "let x=x;" should be an error (unless x
      // was already defined in an outer scope.) Also we need to use the type
      // of the initializer for the type of the variable.
      const initializer = exp.rep()
      const variable = new core.Variable(id.sourceString, initializer.type)
      context.add(id, variable)
      return new core.VariableDeclaration(variable, initializer)
    },

    Statement_fundec(_fun, id, parameters, _equals, exp, _semicolon) {
      // Start by adding a new function object to this context. We won't
      // have its parameters yet; that will come later. But it is important
      // to get the function in the context right way, to allow recursion.
      const fun = new core.Function(id.sourceString)
      context.add(id, fun)

      // The parameters and the body will go into a new inner context.
      context = new Context(context)
      fun.params = parameters.rep()
      const body = exp.rep()
      fun.type = body.type
      context = context.parent

      return new core.FunctionDeclaration(fun, body)
    },

    Params(_open, idList, _close) {
      return idList.asIteration().children.map((id) => {
        // Create a variable entity for each parameter. The type is initially
        // undefined, but type inference will kick in during the analysis of
        // the function body.
        const param = new core.Variable(id.sourceString, undefined)
        context.add(id, param)
        return param
      })
    },

    Statement_assign(id, eq, exp, _semicolon) {
      const [target, source] = [id.rep(), exp.rep()]
      check.assignable({ from: target, to: source, at: eq })
      return new core.Assignment(target, source)
    },

    Statement_print(_print, exp, _semicolon) {
      return new core.PrintStatement(exp.rep())
    },

    Statement_while(_while, exp, block) {
      const [test, body] = [exp.rep(), block.rep()]
      check.isABoolean(test, { at: exp })
      return new core.WhileStatement(test, body)
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep())
    },

    Exp_unary(op, exp) {
      const [o, x] = [op.sourceString, exp.rep()]
      if (o === "-") check.isANumber(x, { at: exp })
      else check.isABoolean(x, { at: exp })
      return new core.UnaryExpression(o, x)
    },

    Exp_ternary(exp1, _questionMark, exp2, colon, exp3) {
      const [x, y, z] = [exp1.rep(), exp2.rep(), exp3.rep()]
      check.isABoolean(x, { at: exp1 })
      check.assignable({ from: y, to: z, at: colon })
      return new core.Conditional(x, y, z)
    },

    Exp1_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreBooleans(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp2_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreBooleans(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp3_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp4_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp5_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp6_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      check.bothAreNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp7_parens(_open, exp, _close) {
      return exp.rep()
    },

    Call(id, open, expList, _close) {
      const callee = context.lookup(id, { expecting: core.Function })
      const exps = expList.asIteration().children
      check.correctArgCount(exps.length, callee.params.length, { at: open })
      const args = exps.map((exp, i) => {
        const arg = exp.rep()
        check.assignable({ from: arg, to: callee.params[i], at: exp })
        return arg
      })
      return new core.Call(callee, args)
    },

    Exp7_id(id) {
      return context.lookup(id, { expecting: core.Variable })
    },

    true(_) {
      return true
    },

    false(_) {
      return false
    },

    num(_whole, _point, _fraction) {
      return Number(this.sourceString)
    },
  })

  return analyzer(match).rep()
}
