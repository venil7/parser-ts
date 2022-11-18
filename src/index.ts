import { isRight } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  anyWord,
  between,
  chain,
  char,
  greedy,
  join,
  keywords,
  Parser,
  run,
  spaces,
  surrouned,
} from "./parser";

// const text = `{mickey:integer}{mouse:string}`;
const text = `abc 123 gef mickey mouse`;

// {name:type}
const token: Parser = pipe(
  anyWord,
  chain(char(":")),
  chain(keywords("integer", "string")),
  surrouned(char("{"), char("}")),
  join,
  greedy
);

const tkn = pipe(anyWord, between(spaces), greedy);

const res1 = run(tkn, text);
console.log(isRight(res1) ? res1.right : res1.left);
