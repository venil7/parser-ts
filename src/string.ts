import { pipe } from "fp-ts/lib/function";
import {
  alt,
  greedy,
  getPredicate,
  getOptional,
  map,
  Parser,
  chain,
  toList,
} from "./parser";

export const predicate = getPredicate("", (c) => c[0]);
export const optional = getOptional("");

const LETTERS = "abcdefghijklmnopqrstuvwxyx";
const UPPER_LETTERS = LETTERS.toUpperCase();
const DIGIT = "0123456789";

export const join: (p1: Parser<string[]>) => Parser<string> = map<
  string[],
  string
>((arr) => arr.join(""));

export const char = (c: string) =>
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
export const anyAlphachar = pipe(alphachar, alt(upperAlphachar));
export const digit = predicate((c) => DIGIT.includes(c), `expected digit`);
export const word = pipe(alphachar, greedy, join);
export const upperWord = pipe(upperAlphachar, greedy, join);
export const anyWord = pipe(anyAlphachar, greedy, join);
export const digits = pipe(digit, greedy, join);
export const spaces = pipe(space, greedy, join);

export const string = (s: string): Parser<string> => {
  if (s.length <= 1) return char(s[0]);
  return pipe(char(s[0]), map(toList), chain(string(s.substring(1))), join);
};
export const keywords = (...kw: string[]) =>
  kw.reduce((acc, k) => pipe(acc, alt(string(k))), string(kw[0]));
