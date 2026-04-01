import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { createElement } from "../../src/runtime/index.js";

describe("createElement", () => {
  it("createElement 함수가 export된다", () => {
    expect(typeof createElement).toBe("function");
  });

  it("문자열, 숫자, 배열 자식을 평탄화하고 text vnode로 정규화한다", () => {
    const actual = createElement(
      "div",
      { id: "root" },
      "hello",
      7,
      null,
      false,
      [createElement("strong", {}, "done")],
    );

    expect(actual).toEqual(
      elementNode("div", { id: "root" }, [
        textNode("hello"),
        textNode("7"),
        elementNode("strong", {}, [textNode("done")]),
      ]),
    );
  });

  it("함수형 자식 컴포넌트를 실행하고 children을 props로 전달한다", () => {
    function SectionTitle({ title, children }) {
      return createElement(
        "section",
        { "data-title": title },
        createElement("h2", {}, title),
        ...children,
      );
    }

    const actual = createElement(
      SectionTitle,
      { title: "Hooks" },
      createElement("p", {}, "stateless child"),
    );

    expect(actual).toEqual(
      elementNode("section", { "data-title": "Hooks" }, [
        elementNode("h2", {}, [textNode("Hooks")]),
        elementNode("p", {}, [textNode("stateless child")]),
      ]),
    );
  });
});
