// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { FunctionComponent, createElement } from "../../src/runtime/index.js";

describe("FunctionComponent", () => {
  it("FunctionComponent 클래스가 export된다", () => {
    expect(typeof FunctionComponent).toBe("function");
  });

  it("mount가 루트 함수형 컴포넌트를 처음 렌더링한다", () => {
    function App({ title }) {
      return createElement(
        "section",
        { id: "board" },
        createElement("h1", {}, title),
        createElement("p", {}, "ready"),
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App, { title: "수요 코딩회" });

    instance.mount(container);

    expect(container.querySelector("h1")?.textContent).toBe("수요 코딩회");
    expect(instance.getDebugSnapshot().renderCount).toBe(1);
  });

  it("update가 변경된 부분만 patch하고 영향 없는 형제 DOM은 재사용한다", () => {
    function App({ title }) {
      return createElement(
        "section",
        {},
        createElement("h1", {}, title),
        createElement("p", { id: "stable" }, "same"),
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App, { title: "before" });

    instance.mount(container);
    const stableBefore = container.querySelector("#stable");

    instance.update({ title: "after" });

    expect(container.querySelector("h1")?.textContent).toBe("after");
    expect(container.querySelector("#stable")).toBe(stableBefore);
    expect(instance.getDebugSnapshot().lastPatches).toEqual([
      {
        type: "TEXT",
        path: [0, 0],
        value: "after",
      },
    ]);
  });
});
