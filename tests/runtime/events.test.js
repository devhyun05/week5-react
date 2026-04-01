// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { applyPatches } from "../../src/lib/applyPatches.js";
import { diff } from "../../src/lib/diff.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("event props", () => {
  it("vdomToDom이 onclick과 oninput 핸들러를 DOM에 연결한다", () => {
    let clickCount = 0;
    let inputValue = "";

    const button = vdomToDom(
      elementNode("button", { onclick: () => clickCount += 1 }, [
        textNode("Patch"),
      ]),
    );
    const input = vdomToDom(
      elementNode("input", {
        value: "start",
        oninput: (event) => {
          inputValue = event.target.value;
        },
      }),
    );

    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    input.value = "next";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(clickCount).toBe(1);
    expect(inputValue).toBe("next");
  });

  it("applyPatches가 이벤트 핸들러를 교체하고 제거한다", () => {
    let firstCalls = 0;
    let secondCalls = 0;

    const oldVdom = elementNode("button", { onclick: () => firstCalls += 1 }, [
      textNode("Save"),
    ]);
    const nextVdom = elementNode("button", { onclick: () => secondCalls += 1 }, [
      textNode("Save"),
    ]);
    const removedVdom = elementNode("button", {}, [textNode("Save")]);

    const rootDom = vdomToDom(oldVdom);

    applyPatches(rootDom, diff(oldVdom, nextVdom));
    rootDom.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    applyPatches(rootDom, diff(nextVdom, removedVdom));
    rootDom.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(firstCalls).toBe(0);
    expect(secondCalls).toBe(1);
  });
});
