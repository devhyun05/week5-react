// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { removeDomProp, setDomProp } from "../../src/lib/domProps.js";

describe("domProps", () => {
  it("이벤트 리스너를 등록하고 교체할 수 있다", () => {
    const button = document.createElement("button");
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    setDomProp(button, "onClick", firstListener);
    button.click();

    setDomProp(button, "onClick", secondListener);
    button.click();

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);
  });

  it("이벤트 prop을 제거하면 더 이상 실행되지 않는다", () => {
    const button = document.createElement("button");
    const listener = vi.fn();

    setDomProp(button, "onClick", listener);
    removeDomProp(button, "onClick");
    button.click();

    expect(listener).not.toHaveBeenCalled();
  });
});
