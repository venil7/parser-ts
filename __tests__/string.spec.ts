import { getMonoid } from "fp-ts/lib/Array";
import { pipe } from "fp-ts/lib/function";
import { alt, greedy as Pgreedy, run } from "../src/parser";
import {
  between,
  chain,
  chainMany,
  char,
  digits,
  greedy,
  join,
  keywords,
  map,
  optional,
  predicate,
  space,
  spaces,
  string,
  surrouned,
  word,
} from "../src/string";

describe("simple parsers", () => {
  test("predicate", () => {
    const parser = predicate((c) => c === "A");
    const text = "A";
    expect(run(parser, text).right).toEqual(["A"]);
  });
  test("char", () => {
    const parser = char("c");
    const text = "c";
    expect(run(parser, text).right).toEqual(["c"]);
  });
  test("word", () => {
    const text = "abc123";
    expect(run(word, text).right).toEqual(["abc"]);
  });
  test("string", () => {
    const parser = string("mickey");
    const text = "mickey123";
    expect(run(word, text).right).toEqual(["mickey"]);
  });
});

describe("complex parsers", () => {
  test("chain", () => {
    const parser = pipe(word, chain(digits));
    const text = "abc123";
    expect(run(parser, text).right).toEqual(["abc", "123"]);
  });
  test("chainMany", () => {
    const parser = chainMany(char("a"), char("b"), char("c"));
    const text = "abc123";
    expect(run(parser, text).right).toEqual(["a", "b", "c"]);
  });
  test("greedy", () => {
    const parser = pipe(char("a"), greedy);
    const text = "aaa123";
    expect(run(parser, text).right).toEqual(["a", "a", "a"]);
  });
  test("surrounded", () => {
    const parser = pipe(char("a"), surrouned(char("{"), char("}")));
    const text = "{a}";
    expect(run(parser, text).right).toEqual(["{", "a", "}"]);
  });
  test("between", () => {
    const parser = pipe(char("a"), between(char("|")));
    const text = "|a|";
    expect(run(parser, text).right).toEqual(["|", "a", "|"]);
  });
  test("keyword", () => {
    const parser = pipe(keywords("mickey", "mouse", "goofey"), greedy);
    const text = "mickeymousegoofey";
    expect(run(parser, text).right).toEqual(["mickey", "mouse", "goofey"]);
  });
});

describe("parser combinators", () => {
  test("simple word tokens", () => {
    const parser = pipe(
      word,
      between(optional(space)),
      join,
      map(([s]) => [s.trim()]),
      greedy
    );
    const text = "mickey mouse goofey";
    expect(run(parser, text).right).toEqual(["mickey", "mouse", "goofey"]);
  });
  test('token: {name:type} {name:type="default value"}', () => {
    const typekwd = keywords("integer", "string");
    const sentence = pipe(word, between(optional(spaces)), greedy);
    const defaultValue = pipe(
      char("="),
      chain(pipe(sentence, between(char(`"`))))
    );
    const parser = pipe(
      word,
      chain(char(":")),
      chain(typekwd),
      chain(optional(defaultValue)),
      surrouned(char("{"), char("}")),
      join,
      greedy
    );
    const text = `{mickey:string="hello world"}{mouse:integer}`;
    expect(run(parser, text).right).toEqual([
      `{mickey:string="hello world"}`,
      `{mouse:integer}`,
    ]);
  });
});

describe("mapping to other types", () => {
  type Token = { tag: "num"; value: number } | { tag: "str"; value: string };
  const numToken = (value: number): Token => ({ tag: "num", value });
  const strToken = (value: string): Token => ({ tag: "str", value });
  const tokenMonoid = getMonoid<Token>(); // as unknown as Monoid<Token>;
  test("map to int", () => {
    const parser = pipe(
      digits,
      map(([s]) => [Number(s)])
    );
    const text = "432";
    expect(run(parser, text).right).toEqual([432]);
  });

  test("maping to tokens", () => {
    const str = pipe(
      word,
      surrouned(char("["), char("]")),
      map((parts) => [strToken(parts[1])])
    );
    const num = pipe(
      digits,
      surrouned(char("{"), char("}")),
      map((parts) => [numToken(Number(parts[1]))])
    );
    const parser = pipe(num, alt(str), Pgreedy(tokenMonoid));
    const text = "[hello]{123}[world]{345}";
    expect(run(parser, text).right).toEqual([
      { tag: "str", value: "hello" },
      { tag: "num", value: 123 },
      { tag: "str", value: "world" },
      { tag: "num", value: 345 },
    ]);
  });
});
