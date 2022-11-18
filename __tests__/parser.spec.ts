import { pipe } from "fp-ts/lib/function";
import {
  anyWord,
  between,
  chain,
  chainMany,
  char,
  digits,
  greedy,
  join,
  keywords,
  predicate,
  run,
  space,
  spaces,
  string,
  surrouned,
  word,
} from "../src/parser";

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
  test(" simple word tokens ", () => {
    const parser = word; //pipe(word, between(space), greedy);
    const text = "mickey mouse goofey";
    expect(run(parser, text).right).toEqual(["mickey", "mouse", "goofey"]);
  });
  test("token: {name:type}", () => {
    const typekwd = keywords("integer", "string");
    const parser = pipe(
      word,
      chain(char(":")),
      chain(typekwd),
      surrouned(char("{"), char("}")),
      join,
      greedy
    );
    const text = "{mickey:string}{mouse:integer}";
    expect(run(parser, text).right).toEqual([
      "{mickey:string}",
      "{mouse:integer}",
    ]);
  });
});
