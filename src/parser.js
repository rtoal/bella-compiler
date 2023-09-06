import * as fs from "node:fs"
import * as ohm from "ohm-js"

const grammar = ohm.grammar(`Bella {
  ${fs.readFileSync("src/phrase_grammar.ohm")}
  ${fs.readFileSync("src/lexical_grammar.ohm")}
}`)

export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)
  if (!match.succeeded()) throw new Error(match.message)
  return match
}
