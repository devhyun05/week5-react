// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  FunctionComponent,
  createElement,
  useState,
} from "../../src/runtime/index.js";

describe("useState", () => {
  it("state를 유지하고 functional update로 화면을 다시 그린다", () => {
    let increment = () => {};

    function App() {
      const [count, setCount] = useState(0);
      increment = () => setCount((value) => value + 1);

      return createElement("button", { id: "count" }, String(count));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    increment();
    increment();

    expect(container.querySelector("#count")?.textContent).toBe("2");
    expect(instance.getDebugSnapshot().renderCount).toBe(3);
  });

  it("같은 값을 다시 설정하면 재렌더링하지 않는다", () => {
    let setValue = () => {};

    function App() {
      const [value, setState] = useState(3);
      setValue = setState;

      return createElement("p", { id: "value" }, String(value));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    setValue(3);

    expect(container.querySelector("#value")?.textContent).toBe("3");
    expect(instance.getDebugSnapshot().renderCount).toBe(1);
  });

  it("자식 컴포넌트에서 useState를 호출하면 루트 전용 에러를 던진다", () => {
    function Child() {
      useState(0);
      return createElement("span", {}, "child");
    }

    function App() {
      return createElement("div", {}, createElement(Child, {}));
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    expect(() => instance.mount(container)).toThrowError(
      new Error("Hooks can only be used in the root component."),
    );
  });
});
