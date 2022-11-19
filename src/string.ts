import { getMonoid } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/function";
import * as P from "./parser";

export const stringArrayMonoid = getMonoid<string>();
export const predicate = P.predicate(stringArrayMonoid, (c) => [c[0]]);
export const concat = P.concat(stringArrayMonoid);
export const chain = P.chain(stringArrayMonoid);
export const chainMany = P.chainMany(stringArrayMonoid);
export const surrouned = P.surrouned(stringArrayMonoid);
export const between = P.between(stringArrayMonoid);
export const greedy = P.greedy(stringArrayMonoid);
export const optional = P.optional(stringArrayMonoid);

const LETTERS = "abcdefghijklmnopqrstuvwxyx";
const UPPER_LETTERS = LETTERS.toUpperCase();
const DIGIT = "0123456789";

export const map = P.map;
export const join = P.map<string[], string[]>((arr) => [arr.join("")]);

export const char = (c: string): P.Parser =>
  predicate((cc) => cc === c, `expected character "${c}"`);
export const space = predicate((c) => /\s/g.test(c), `expected space`);
export const alphachar = predicate(
  (c) => LETTERS.includes(c),
  `expected alpha character`
);
export const upperAlphachar = predicate(
  (c) => UPPER_LETTERS.includes(c),
  `expected upper alpha character`
);
export const anyAlphachar = pipe(alphachar, P.alt(upperAlphachar));
export const digit = predicate((c) => DIGIT.includes(c), `expected digit`);
export const word = pipe(greedy(alphachar), join);
export const upperWord = pipe(greedy(upperAlphachar), join);
export const anyWord = pipe(greedy(anyAlphachar), join);
export const digits = pipe(greedy(digit), join);
export const spaces = pipe(greedy(space), join);

export const string = (s: string): P.Parser => {
  if (s.length === 1) return char(s[0]);
  return pipe(char(s[0]), chain(string(s.substr(1))), join);
};
export const keywords = (...kw: string[]): P.Parser =>
  kw.reduce((acc, k) => pipe(acc, P.alt(string(k))), string(kw[0]));
