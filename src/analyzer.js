// ANALYZER
//
// The analyze() function takes the grammar match object (the CST) from Ohm
// and produces a decorated Abstract Syntax "Tree" (technically a graph) that
// includes all entities including those from the standard library.

import * as core from "./core.js"

// The single gate for error checking. Pass in a condition that must be true.
// Use errorLocation to give contextual information about the error that will
// appear: this should be an object whose "at" property is a parse tree node.
// Ohm's getLineAndColumnMessage will be used to prefix the error message.
function must(condition, message, { at: errorLocation }) {
  if (!condition) {
    const prefix = errorLocation.source.getLineAndColumnMessage()
    throw new Error(`${prefix}${message}`)
  }
}

class Context {
  constructor(parent) {
    this.parent = parent
    this.locals = new Map()
  }
  add(id, entity) {
    const name = id.sourceString
    must(!this.locals.has(name), `${name} already declared`, { at: id })
    this.locals.set(name, entity)
  }
  entityFor(name) {
    return this.locals.get(name) || this.parent?.entityFor(name)
  }
  lookup(id, { expecting: kind }) {
    const name = id.sourceString
    const entity = this.entityFor(name)
    must(entity, `${name} has not been declared`, { at: id })
    const hasExpectedKind = entity instanceof kind
    must(hasExpectedKind, `${name} is not a ${kind.name}`, { at: id })
    return entity
  }
}

export default function analyze(match) {
  let context = new Context()

  function checkAssignable({ from, to, at }) {
    if (from.type === undefined) {
      if (from instanceof core.Variable) from.type = to.type
      else if (from instanceof core.Call) from.callee.type = from.type = to.type
    }
    if (to.type === undefined) {
      if (to instanceof core.Variable) to.type = from.type
      else if (to instanceof core.Call) to.callee.type = to.type = from.type
    }
    const stillBothUndefined = from.type === undefined && to.type === undefined
    must(!stillBothUndefined, `Cannot infer types`, { at })
    must(from.type === to.type, `Expected ${to.type}, got ${from.type}`, { at })
  }

  function checkNumber(entity, { at }) {
    checkAssignable({ from: entity, to: { type: "number" }, at })
  }

  function checkBoolean(entity, { at }) {
    checkAssignable({ from: entity, to: { type: "boolean" }, at })
  }

  function checkBothNumbers(entity1, entity2, { at }) {
    checkNumber(entity1, { at })
    checkNumber(entity2, { at })
  }

  function checkBothBooleans(entity1, entity2, { at }) {
    checkBoolean(entity1, { at })
    checkBoolean(entity2, { at })
  }

  function checkArgCount(argCount, paramCount, { at }) {
    const message = `${paramCount} argument(s) required but ${argCount} passed`
    must(argCount === paramCount, message, { at })
  }

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
      // have the number of params yet; that will come later. But we have
      // to get the function in the context right way, to allow recursion.
      const fun = new core.Function(id.sourceString)
      context.add(id, fun)

      // Add the params and body to the child context, updating the
      // function object with the parameter count once we have it.
      context = new Context(context)
      fun.params = parameters.rep()
      const body = exp.rep()
      fun.type = body.type
      context = context.parent

      return new core.FunctionDeclaration(fun, body)
    },

    Params(_open, idList, _close) {
      return idList.asIteration().children.map((id) => {
        const param = new core.Variable(id.sourceString, undefined)
        context.add(id, param)
        return param
      })
    },

    Statement_assign(id, eq, exp, _semicolon) {
      const [target, source] = [id.rep(), exp.rep()]
      checkAssignable({ from: target, to: source, at: eq })
      return new core.Assignment(target, source)
    },

    Statement_print(_print, exp, _semicolon) {
      return new core.PrintStatement(exp.rep())
    },

    Statement_while(_while, exp, block) {
      checkBoolean(exp.rep(), { at: exp })
      return new core.WhileStatement(exp.rep(), block.rep())
    },

    Block(_open, statements, _close) {
      return statements.children.map((s) => s.rep())
    },

    Exp_unary(op, exp) {
      const [o, x] = [op.sourceString, exp.rep()]
      if (o === "-") checkNumber(x, { at: exp })
      else checkBoolean(x, { at: exp })
      return new core.UnaryExpression(o, x)
    },

    Exp_ternary(exp1, _questionMark, exp2, colon, exp3) {
      const [x, y, z] = [exp1.rep(), exp2.rep(), exp3.rep()]

      checkBoolean(x, { at: exp1 })
      checkAssignable({ from: y, to: z, at: colon })
      return new core.Conditional(x, y, z)
    },

    Exp1_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothBooleans(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp2_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothBooleans(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp3_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp4_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp5_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp6_binary(exp1, op, exp2) {
      const [o, x, y] = [op.sourceString, exp1.rep(), exp2.rep()]
      checkBothNumbers(x, y, { at: op })
      return new core.BinaryExpression(o, x, y)
    },

    Exp7_parens(_open, exp, _close) {
      return exp.rep()
    },

    Call(id, open, expList, _close) {
      const callee = context.lookup(id, { expecting: core.Function })
      const exps = expList.asIteration().children
      checkArgCount(exps.length, callee.params.length, { at: open })
      const args = exps.map((exp, i) => {
        const arg = exp.rep()
        checkAssignable({ from: arg, to: callee.params[i], at: exp })
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
