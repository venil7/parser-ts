import { getMonoid } from "fp-ts/lib/Array";
import {
  Either,
  isLeft,
  isRight,
  left,
  map as emap,
  right,
} from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { Monoid } from "fp-ts/lib/Monoid";
import { Predicate } from "fp-ts/lib/Predicate";
import { map as rmap } from "fp-ts/lib/ReaderEither";
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
export type ParseResult<T> = Either<ParseError, [Stream, T]>;
export type Parser<T = string[]> = (s: Stream) => ParseResult<T>;

export const stream = (s: string): Stream => ({ chars: s.split(""), index: 0 });
export const run = <T>(p: Parser<T>, s: string): Either<ParseError, T> =>
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

export const stringArrayMonoid = getMonoid<string>();

export const predicate =
  <T>(m: Monoid<T>, mapf: (c: string) => T) =>
  (pred: Predicate<string>, msg = "not matching predicate"): Parser<T> =>
  (s) => {
    const { chars, index } = s;
    if (isEof({ chars, index })) return right([s, m.empty]);
    return pred(chars[index])
      ? right([advance({ chars, index }), mapf(chars[index])])
      : left(error(`${index}: ${msg}`));
  };

export const concat =
  <T>(m: Monoid<T>) =>
  (r1: ParseResult<T>, r2: ParseResult<T>): ParseResult<T> => {
    if (isLeft(r1)) return r1;
    if (isLeft(r2)) return r2;
    const [, s1] = r1.right;
    const [stream, s2] = r2.right;
    return right([stream, m.concat(s1, s2)]);
  };

export const chain =
  <T>(m: Monoid<T>) =>
  (p2: Parser<T>) =>
  (p1: Parser<T>): Parser<T> => {
    return (s) => {
      const res1 = p1(s);
      if (isLeft(res1)) return res1;
      const [stream1] = res1.right;
      const res2 = p2(stream1);
      if (isLeft(res2)) return res2;
      return concat(m)(res1, res2);
    };
  };

export const alt =
  <T>(p1: Parser<T>) =>
  (p2: Parser<T>): Parser<T> => {
    return (s) => {
      const res1 = p1(s);
      if (isRight(res1)) return res1;

      const res2 = p2(s);
      if (isRight(res2)) return res2;

      return left(error(`${res1.left.msg} | ${res2.left.msg}`));
    };
  };

export const greedy =
  <T>(m: Monoid<T>) =>
  (p: Parser<T>): Parser<T> => {
    return (s) => {
      let res = p(s);
      while (isRight(res)) {
        if (isEof(res.right[0])) break;
        const res1 = p(res.right[0]);
        if (isLeft(res1)) break;
        res = concat(m)(res, res1);
      }
      return res;
    };
  };

export const optional =
  <T>(m: Monoid<T>) =>
  (p: Parser<T>): Parser<T> => {
    return (s) => {
      const res = p(s);
      if (isRight(res)) return res;
      return right([s, m.empty]);
    };
  };

export const map = <TIn, TOut = TIn>(func: (ss: TIn) => TOut) =>
  rmap(([stream, chars]: [Stream, TIn]): [Stream, TOut] => [
    stream,
    func(chars),
  ]);

export const chainMany =
  <T>(m: Monoid<T>) =>
  (...ps: Parser<T>[]): Parser<T> =>
    ps.reduce((acc, p) => chain(m)(p)(acc));

export const surrouned =
  <T>(m: Monoid<T>) =>
  (p1: Parser<T>, p2: Parser<T>) =>
  (p: Parser<T>) =>
    chainMany(m)(p1, p, p2);

export const between =
  <T>(m: Monoid<T>) =>
  (p1: Parser<T>) =>
  (p: Parser<T>) =>
    surrouned(m)(p1, p1)(p);
