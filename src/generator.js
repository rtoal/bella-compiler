export default function generate(program) {
  // Variable names in JS will be suffixed with _1, _2, _3, etc. This is
  // because "for", for example, is a legal variable name in Bella, but
  // not in JS. So we want to generate something like "for_1". We handle
  // this by mapping each variable declaration to its suffix.
  const suffixes = new Map()
  function targetName(entity) {
    if (!suffixes.has(entity)) {
      suffixes.set(entity, suffixes.size + 1)
    }
    return `${entity.name}_${suffixes.get(entity)}`
  }

  // Dispatch to the appropriate generator based on the node's type.
  // If there is no appropriate generator, just return the node. This
  // will happen for numbers and boolean literals, for example.
  function gen(node) {
    if (!(node.constructor.name in generators)) return node
    return generators[node.constructor.name](node)
  }

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
    Array(a) {
      return a.map(gen)
    },
  }
  return gen(program)
}
