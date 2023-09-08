export default function generate(program) {
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

  // A little dispatch on the node type. We'll use this to generate the
  // JS code (as a string) for each node. Assumes that the node will
  // have a constructor name that matches one of the keys in the object.
  const gen = (node) => generators[node.constructor.name](node)

  const generators = {
    Program({ statements }) {
      return gen(statements).join("\n")
    },
    VariableDeclaration({ variable, initializer }) {
      return `let ${gen(variable)} = ${gen(initializer)};`
    },
    Variable(variable) {
      return targetName(variable)
    },
    FunctionDeclaration({ fun, body }) {
      const name = gen(fun)
      const params = fun.params.map(gen).join(", ")
      return `function ${name}(${params}) { return ${gen(body)}; }`
    },
    Function(fun) {
      return targetName(fun)
    },
    PrintStatement({ argument }) {
      return `console.log(${gen(argument)});`
    },
    Assignment({ target, source }) {
      return `${gen(target)} = ${gen(source)};`
    },
    WhileStatement({ test, body }) {
      return [`while (${gen(test)}) {`, ...gen(body), "}"].join("\n")
    },
    Call({ callee, args }) {
      return `${gen(callee)}(${gen(args)})`
    },
    Conditional({ test, consequent, alternate }) {
      return `((${gen(test)}) ? (${gen(consequent)}) : (${gen(alternate)}))`
    },
    BinaryExpression({ left, op, right }) {
      return `(${gen(left)} ${op} ${gen(right)})`
    },
    UnaryExpression({ op, operand }) {
      return `${op}(${gen(operand)})`
    },
    Number(n) {
      return n
    },
    Boolean(b) {
      return b
    },
    Array(a) {
      return a.map(gen)
    },
  }
  return gen(program)
}
