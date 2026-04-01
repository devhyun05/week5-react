// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  FunctionComponent,
  createElement,
  useMemo,
  useState,
} from "../../src/runtime/index.js";

describe("useMemo", () => {
  it("의존성이 유지되면 캐시를 재사용하고, 바뀌면 다시 계산한다", () => {
    let computeCount = 0;
    let setCount = () => {};
    let setQuery = () => {};

    function App() {
      const [count, updateCount] = useState(1);
      const [query, updateQuery] = useState("");

      setCount = updateCount;
      setQuery = updateQuery;

      const doubled = useMemo(() => {
        computeCount += 1;
        return count * 2;
      }, [count]);

      return createElement(
        "div",
        {},
        createElement("span", { id: "value" }, String(doubled)),
        createElement("span", { id: "query" }, query),
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    setQuery("memo");
    setCount(2);

    expect(computeCount).toBe(2);
    expect(container.querySelector("#value")?.textContent).toBe("4");
  });

  it("자식 컴포넌트에서 useMemo를 호출하면 루트 전용 에러를 던진다", () => {
    function Child() {
      useMemo(() => 1, []);
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
