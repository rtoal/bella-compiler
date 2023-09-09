import * as ohm from "ohm-js"

export const grammar = ohm.grammar(String.raw`Bella {
  Program   = Statement+
  Statement = let id "=" Exp ";"                       -- vardec
            | func id Params "=" Exp ";"               -- fundec
            | Exp7_id "=" Exp ";"                      -- assign
            | print Exp ";"                            -- print
            | while Exp Block                          -- while
  Params    = "(" ListOf<id, ","> ")"
  Block     = "{" Statement* "}"
  Exp       = ("-" | "!") Exp7                         -- unary
            | Exp1 "?" Exp1 ":" Exp                    -- ternary
            | Exp1
  Exp1      = Exp1 "||" Exp2                           -- binary
            | Exp2
  Exp2      = Exp2 "&&" Exp3                           -- binary
            | Exp3
  Exp3      = Exp4 ("<="|"<"|"=="|"!="|">="|">") Exp4  -- binary
            | Exp4
  Exp4      = Exp4 ("+" | "-") Exp5                    -- binary
            | Exp5
  Exp5      = Exp5 ("*" | "/" | "%") Exp6              -- binary
            | Exp6
  Exp6      = Exp7 "**" Exp6                           -- binary
            | Exp7
  Exp7      = num
            | true
            | false
            | Call                                     -- call
            | id                                       -- id
            | "(" Exp ")"                              -- parens
  Call      = id "(" ListOf<Exp, ","> ")"
  num       = digit+ ("." digit+)?
  let       = "let" ~idchar
  func      = "func" ~idchar
  print     = "print" ~idchar
  while     = "while" ~idchar
  true      = "true" ~idchar
  false     = "false" ~idchar
  keyword   = let | func | print | while | true | false
  id        = ~keyword letter idchar*
  idchar    = letter | digit | "_"
  comment   = "//" (~"\n" any)*
  space    += comment
}`)

export default function parse(sourceCode) {
  const match = grammar.match(sourceCode)
  if (!match.succeeded()) throw new Error(match.message)
  return match
}
