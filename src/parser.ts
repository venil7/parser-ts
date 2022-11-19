import {
  right,
  left,
  Either,
  isLeft,
  isRight,
  map as emap,
} from "fp-ts/lib/Either";
import { map as rmap } from "fp-ts/lib/ReaderEither";
import { pipe } from "fp-ts/lib/function";
import { Predicate } from "fp-ts/lib/Predicate";
enum ErrorType {
  Eof,
  Parser,
  Fatal,
}
export type Stream = { chars: string[]; index: number };
export type ParseError = { type: ErrorType; msg: string };
export const error = (msg: string): ParseError => ({
  type: ErrorType.Parser,
  msg,
});
const eof = (): ParseError => ({ type: ErrorType.Eof, msg: "end of stream" });
export type ParseResult = Either<ParseError, [Stream, string[]]>;
export type Parser = (s: Stream) => ParseResult;

export const stream = (s: string): Stream => ({ chars: s.split(""), index: 0 });
export const run = (p: Parser, s: string): Either<ParseError, string[]> =>
  pipe(
    p(stream(s)),
    emap((res) => res[1])
  );

const isEof = ({ index, chars }: Stream) => {
  return index >= chars.length;
};

const advance = ({ index, chars }: Stream): Stream => ({
  index: index + 1,
  chars,
});

export const predicate =
  (pred: Predicate<string>, msg = "not matching predicate"): Parser =>
  (s) => {
    const { chars, index } = s;
    if (isEof({ chars, index })) return right([s, [""]]);
    return pred(chars[index])
      ? right([advance({ chars, index }), [chars[index]]])
      : left(error(`${index}: ${msg}`));
  };

const concat = (r1: ParseResult, r2: ParseResult): ParseResult => {
  if (isLeft(r1)) return r1;
  if (isLeft(r2)) return r2;
  const [, s1] = r1.right;
  const [stream, s2] = r2.right;
  return right([stream, [...s1, ...s2]]);
};

export const chain =
  (p2: Parser) =>
  (p1: Parser): Parser => {
    return (s) => {
      const res1 = p1(s);
      if (isLeft(res1)) return res1;
      const [stream1] = res1.right;
      const res2 = p2(stream1);
      if (isLeft(res2)) return res2;
      return concat(res1, res2);
    };
  };

export const alt =
  (p1: Parser) =>
  (p2: Parser): Parser => {
    return (s) => {
      const res1 = p1(s);
      if (isRight(res1)) return res1;

      const res2 = p2(s);
      if (isRight(res2)) return res2;

      return left(error(`${res1.left.msg} | ${res2.left.msg}`));
    };
  };
const LETTERS = "abcdefghijklmnopqrstuvwxyx";
const UPPER_LETTERS = LETTERS.toUpperCase();
const DIGIT = "0123456789";

export const greedy = (p: Parser): Parser => {
  return (s) => {
    let res = p(s);
    while (isRight(res)) {
      if (isEof(res.right[0])) break;
      const res1 = p(res.right[0]);
      if (isLeft(res1)) break;
      res = concat(res, res1);
    }
    return res;
  };
};

export const optional = (p: Parser): Parser => {
  return (s) => {
    const res = p(s);
    if (isRight(res)) return res;
    return right([s, [""]]);
  };
};

export const map = (func: (ss: string[]) => string) =>
  rmap(([stream, chars]: [Stream, string[]]): [Stream, string[]] => [
    stream,
    [func(chars)],
  ]);
export const join = map((arr) => arr.join(""));

export const char = (c: string): Parser =>
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

export const word = pipe(greedy(alphachar), join);
export const upperWord = pipe(greedy(upperAlphachar), join);
export const anyWord = pipe(greedy(anyAlphachar), join);
export const digits = pipe(greedy(digit), join);
export const spaces = pipe(greedy(space), join);

// export const everythingUntil =

export const string = (s: string): Parser => {
  if (s.length === 1) return char(s[0]);
  return pipe(char(s[0]), chain(string(s.substr(1))), join);
};
export const chainMany = (...ps: Parser[]): Parser =>
  ps.reduce((acc, p) => chain(p)(acc));

export const surrouned = (p1: Parser, p2: Parser) => (p: Parser) =>
  chainMany(p1, p, p2);
export const between = (p1: Parser) => (p: Parser) => surrouned(p1, p1)(p);

export const keywords = (...kw: string[]): Parser =>
  kw.reduce((acc, k) => pipe(acc, alt(string(k))), string(kw[0]));
