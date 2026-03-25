// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { elementNode, textNode } from "../../src/constants.js";
import { domToVdom } from "../../src/lib/domToVdom.js";
import { renderTo } from "../../src/lib/renderTo.js";
import { vdomToDom } from "../../src/lib/vdomToDom.js";

describe("renderTo", () => {
  // -----
  // renderTo가 함수로 export되어 있는지 확인
  // -----
  it("exposes a function placeholder", () => {
    expect(typeof renderTo).toBe("function");
  });

  // -----
  // 아무 자식도 없는 빈 컨테이너에 vdom을 렌더링하는 상황
  // 컨테이너에 자식이 정확히 1개 생성되고 태그명·텍스트가 맞아야 함
  // -----
  it("renders into an empty container", () => {
    const container = document.createElement("div");
    const vdom = elementNode("section", { id: "app" }, [textNode("Hello")]);

    renderTo(container, vdom);

    expect(container.childNodes).toHaveLength(1);
    expect(container.firstChild?.nodeName).toBe("SECTION");
    expect(container.textContent).toBe("Hello");
  });

  // -----
  // 이미 기존 자식 노드들(<p>, <span>)이 있는 컨테이너에 새 vdom을 렌더링하는 상황
  // 기존 내용을 모두 제거하고 새 노드 하나로 교체해야 함 (append가 아닌 replace)
  // -----
  it("replaces existing children instead of appending", () => {
    const container = document.createElement("div");
    const vdom = elementNode("main", { title: "next" }, [textNode("Fresh content")]);

    container.innerHTML = "<p>old</p><span>stale</span>";

    renderTo(container, vdom);

    expect(container.childNodes).toHaveLength(1);
    expect(container.querySelector("p")).toBeNull();
    expect(container.firstChild?.nodeName).toBe("MAIN");
    expect(container.textContent).toBe("Fresh content");
  });

  // -----
  // renderTo의 결과가 vdomToDom을 단독으로 호출한 결과와 동일한지,
  // 그리고 렌더링된 DOM을 다시 domToVdom으로 역변환하면 원본 vdom과 일치하는지(왕복 무결성) 확인
  // -----
  it("matches standalone vdomToDom output and preserves roundtrip structure", () => {
    const container = document.createElement("div");
    const vdom = elementNode("article", { id: "post", "data-kind": "demo" }, [
      elementNode("h1", {}, [textNode("Title")]),
      elementNode("p", {}, [textNode("Body")]),
    ]);
    const expectedDom = vdomToDom(vdom);

    renderTo(container, vdom);

    expect(container.firstChild?.isEqualNode(expectedDom)).toBe(true);
    expect(domToVdom(container.firstChild)).toEqual(vdom);
  });
});
