import { isRight } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  alt,
  between,
  char,
  greedy,
  join,
  keywords,
  run,
  spaces,
  string,
  surrouned,
} from "./parser";

const text = `abcfffdef(korova)`;

let old = pipe(string("abc"), alt(string("def")), alt(string("fff")), greedy);

const p = pipe(keywords("abc", "def", "fff", "(korova)"), greedy);

const res1 = run(old, text);
const res2 = run(p, text);
console.log(isRight(res1) ? res1.right : res1.left);
console.log(isRight(res2) ? res2.right : res2.left);
