// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("vdomToDom", () => {
  // -----
  // vdomToDom이 함수로 export되어 있는지 확인
  // -----
  it("exposes a function placeholder", () => {
    expect(typeof vdomToDom).toBe("function");
  });

  // -----
  // 텍스트 vnode를 실제 DOM Text 노드로 변환하는 상황
  // nodeType이 TEXT_NODE이고 nodeValue가 원본 문자열과 일치해야 함
  // -----
  it("converts a text vnode into a Text node", () => {
    const domNode = vdomToDom(textNode("hello"));

    expect(domNode.nodeType).toBe(Node.TEXT_NODE);
    expect(domNode.nodeValue).toBe("hello");
  });

  // -----
  // 속성(id, title, data-*)과 텍스트 자식을 가진 element vnode를
  // 실제 DOM 엘리먼트로 변환하는 상황
  // 태그명, 각 속성 값, 텍스트 내용이 모두 정확히 반영되어야 함
  // -----
  it("creates an element with attributes and text children", () => {
    const domNode = vdomToDom(
      elementNode("button", { id: "save", title: "Save", "data-count": 3 }, [
        textNode("Save"),
      ]),
    );

    expect(domNode.nodeType).toBe(Node.ELEMENT_NODE);
    expect(domNode.nodeName).toBe("BUTTON");
    expect(domNode.getAttribute("id")).toBe("save");
    expect(domNode.getAttribute("title")).toBe("Save");
    expect(domNode.getAttribute("data-count")).toBe("3");
    expect(domNode.textContent).toBe("Save");
  });

  // -----
  // element vnode 안에 자식 element vnode들이 중첩된 상황
  // 재귀적으로 변환되어 실제 DOM 트리에 h1, p가 모두 생성되어야 하고
  // 직속 자식 수도 정확히 2개여야 함
  // -----
  it("renders nested children recursively", () => {
    const domNode = vdomToDom(
      elementNode("section", { id: "root" }, [
        elementNode("h1", {}, [textNode("Title")]),
        elementNode("p", {}, [textNode("Body copy")]),
      ]),
    );

    expect(domNode.querySelector("h1")?.textContent).toBe("Title");
    expect(domNode.querySelector("p")?.textContent).toBe("Body copy");
    expect(domNode.childNodes).toHaveLength(2);
  });
});
