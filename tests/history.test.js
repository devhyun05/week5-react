import { describe, expect, it } from "vitest";
import { createHistory } from "../src/history.js";

describe("history", () => {
  it("createHistory 함수가 export된다", () => {
    // given

    // when
    const actual = typeof createHistory;

    // then
    expect(actual).toBe("function");
  });
});
