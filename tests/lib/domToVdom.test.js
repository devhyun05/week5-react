// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { domToVdom } from "../../src/lib/domToVdom.js";

describe("domToVdom", () => {
  // -----
  // domToVdom이 함수로 export되어 있는지 확인
  // -----
  it("exposes a function placeholder", () => {
    expect(typeof domToVdom).toBe("function");
  });

  // -----
  // 실제 DOM Text 노드를 텍스트 vnode로 변환하는 상황
  // 반환값이 textNode() 팩토리로 만든 vnode와 동일해야 함
  // -----
  it("converts a text node to a text vnode", () => {
    const domNode = document.createTextNode("hello");

    expect(domToVdom(domNode)).toEqual(textNode("hello"));
  });

  // -----
  // 속성과 혼합 자식(텍스트 + 중첩 엘리먼트)을 가진 실제 DOM 트리를
  // vnode 구조로 변환하는 상황
  // 태그명, 속성, 자식 순서가 모두 원본 DOM과 일치해야 함
  // -----
  it("converts an element tree to a vnode structure", () => {
    const article = document.createElement("article");
    const strong = document.createElement("strong");

    article.setAttribute("id", "intro");
    article.setAttribute("data-count", "3");
    article.append("Hello ");
    strong.textContent = "world";
    article.append(strong);

    expect(domToVdom(article)).toEqual(
      elementNode("article", { id: "intro", "data-count": "3" }, [
        textNode("Hello "),
        elementNode("strong", {}, [textNode("world")]),
      ]),
    );
  });

  // -----
  // 지원하지 않는 노드 타입(주석 노드)을 만났을 때의 상황
  // 주석 노드 단독 변환 시 null을 반환하고,
  // 자식으로 포함된 주석 노드는 무시한 채 나머지 자식만 vnode에 포함해야 함
  // -----
  it("ignores unsupported comment nodes", () => {
    const wrapper = document.createElement("div");
    const comment = document.createComment("skip me");

    wrapper.append(comment);
    wrapper.append(document.createTextNode("kept"));

    expect(domToVdom(comment)).toBeNull();
    expect(domToVdom(wrapper)).toEqual(
      elementNode("div", {}, [textNode("kept")]),
    );
  });
});
