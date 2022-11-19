import {
  Either,
  isLeft,
  isRight,
  left,
  map as emap,
  right,
} from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { NonEmptyArray } from "fp-ts/lib/NonEmptyArray";
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
export type Parser<T> = (s: Stream) => ParseResult<T>;

export const stream = (s: string): Stream => ({ chars: s.split(""), index: 0 });
export const run = <T>(p: Parser<T>, s: string): Either<ParseError, T> =>
  pipe(
    p(stream(s)),
    emap(([, res]) => res)
  );

const isEof = ({ index, chars }: Stream) => {
  return index >= chars.length;
};

const advance = ({ index, chars }: Stream): Stream => ({
  index: index + 1,
  chars,
});

export const toList = <T>(x: T): T[] => [x];

export const getPredicate =
  <T>(eof: T, mapf: (c: string) => T) =>
  (pred: Predicate<string>, msg = "not matching predicate"): Parser<T> =>
  (s) => {
    const { chars, index } = s;
    if (isEof({ chars, index })) return right([s, eof]);
    return pred(chars[index])
      ? right([advance({ chars, index }), mapf(chars[index])])
      : left(error(`${index}: ${msg}`));
  };

export const chain =
  <T>(p2: Parser<T>) =>
  (p1: Parser<T[]>): Parser<T[]> => {
    return (s) => {
      const res1 = p1(s);
      if (isLeft(res1)) return res1;
      const [stream1, t1] = res1.right;
      const res2 = p2(stream1);
      if (isLeft(res2)) return res2;
      const [stream2, t2] = res2.right;
      return right([stream2, [...t1, t2]]);
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

export const greedy = <T>(p: Parser<T>): Parser<T[]> => {
  return (s: Stream) => {
    let res1 = pipe(p, map(toList))(s);
    while (isRight(res1)) {
      const [stream1, t1] = res1.right;
      if (isEof(stream1)) break;
      const res2 = p(stream1);
      if (isLeft(res2)) break;
      const [stream2, t2] = res2.right;
      res1 = right([stream2, [...t1, t2]]);
    }
    return res1;
  };
};

export const getOptional =
  <T>(fallback: T) =>
  (p: Parser<T>): Parser<T> => {
    return (s) => {
      const res = p(s);
      if (isRight(res)) return res;
      return right([s, fallback]);
    };
  };

export const map = <TIn, TOut>(func: (ss: TIn) => TOut) =>
  rmap<[Stream, TIn], [Stream, TOut]>(([stream, data]) => [stream, func(data)]);

export const chainMany = <T>(...ps: NonEmptyArray<Parser<T>>): Parser<T[]> => {
  const first: Parser<T[]> = pipe(ps[0], map(toList));
  const [, ...rest] = ps;
  return rest.reduce((acc, p) => chain(p)(acc), first);
};

export const surrouned =
  <T>(p1: Parser<any>, p2: Parser<any>) =>
  (p: Parser<T>) =>
    pipe(
      chainMany(p1, p, p2),
      map(([, center]) => center as T)
    );

export const between =
  <T>(p1: Parser<T>) =>
  (p: Parser<T>) =>
    surrouned<T>(p1, p1)(p);
