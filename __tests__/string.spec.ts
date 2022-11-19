import { isRight } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import {
  alt,
  between,
  chain,
  chainMany,
  greedy,
  map,
  run,
  surrouned,
  toList,
} from "../src/parser";
import {
  char,
  digits,
  join,
  keywords,
  optional,
  predicate,
  space,
  spaces,
  string,
  word,
} from "../src/string";

describe("simple parsers", () => {
  test("predicate", () => {
    const parser = predicate((c) => c === "A");
    const text = "A";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("A");
  });
  test("char", () => {
    const parser = char("c");
    const text = "c";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("c");
  });
  test("word", () => {
    const parser = word;
    const text = "abc123";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("abc");
  });
  test("string", () => {
    const parser = string("mickey");
    const text = "mickey123";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("mickey");
  });
});

describe("complex parsers", () => {
  test("chain", () => {
    const parser = pipe(word, map(toList), chain(digits));
    const text = "abc123";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(["abc", "123"]);
  });
  test("chainMany", () => {
    const parser = chainMany(char("a"), char("b"), char("c"));
    const text = "abc123";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(["a", "b", "c"]);
  });
  test("greedy", () => {
    const parser = pipe(char("a"), greedy);
    const text = "aaa123";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(["a", "a", "a"]);
  });
  test("surrounded", () => {
    const parser = pipe(char("a"), surrouned(char("{"), char("}")));
    const text = "{a}";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("a");
  });
  test("between", () => {
    const parser = pipe(char("a"), between(char("|")));
    const text = "|a|";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual("a");
  });
  test("keyword", () => {
    const parser = pipe(keywords("mickey", "mouse", "goofey"), greedy);
    const text = "mickeymousegoofey";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(["mickey", "mouse", "goofey"]);
  });
});

describe("parser combinators", () => {
  test("simple word tokens", () => {
    const parser = pipe(
      word,
      between(optional(space)),
      map((s) => s.trim()),
      greedy
    );
    const text = "mickey mouse goofey";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(["mickey", "mouse", "goofey"]);
  });
  test('token: {name:type} {name:type="default value"}', () => {
    const typekwd = keywords("integer", "string");
    const sentence = pipe(word, alt(spaces), greedy, join);
    const defaultValue = join(
      chainMany(char("="), char(`"`), sentence, char(`"`))
    );
    const parser = pipe(
      chainMany(
        char("{"),
        word,
        char(":"),
        typekwd,
        optional(defaultValue),
        char("}")
      ),
      join,
      greedy
    );
    const text = `{mickey:string="hello world"}{mouse:integer}`;
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual([
      `{mickey:string="hello world"}`,
      `{mouse:integer}`,
    ]);
  });
});

describe("mapping to other types", () => {
  test("map to int", () => {
    const parser = pipe(digits, map(Number));
    const text = "432";
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual(432);
  });

  test("maping to tokens", () => {
    type Token =
      | { tag: "num"; value: number }
      | { tag: "str"; value: string }
      | { tag: "space" };
    const numToken = (value: number): Token => ({ tag: "num", value });
    const strToken = (value: string): Token => ({ tag: "str", value });
    const spaceToken = (): Token => ({ tag: "space" });
    const str = pipe(
      word,
      surrouned(char("["), char("]")),
      map((s) => strToken(s))
    );
    const num = pipe(
      digits,
      surrouned(char("{"), char("}")),
      map((n) => numToken(Number(n)))
    );
    const space = pipe(optional(spaces), map(spaceToken));
    const token = pipe(num, alt(str), between(space));
    const parser = pipe(token, greedy);
    const text = `  [hello] {123}    [world]  {345}`;
    const res = run(parser, text);
    expect(isRight(res) && res.right).toEqual([
      strToken("hello"),
      numToken(123),
      strToken("world"),
      numToken(345),
    ]);
  });
});
