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

  it("자식 컴포넌트마다 memo cache를 독립적으로 유지한다", () => {
    const computeCounts = {
      left: 0,
      right: 0,
    };
    let updateLeft = () => {};
    let updateQuery = () => {};

    function Child({ id, value }) {
      const doubled = useMemo(() => {
        computeCounts[id] += 1;
        return value * 2;
      }, [value]);

      return createElement("span", { id: `value-${id}` }, String(doubled));
    }

    function App() {
      const [left, setLeft] = useState(1);
      const [right] = useState(10);
      const [query, setQuery] = useState("");

      updateLeft = setLeft;
      updateQuery = setQuery;

      return createElement(
        "div",
        {},
        createElement(Child, { key: "left", id: "left", value: left }),
        createElement(Child, { key: "right", id: "right", value: right }),
        createElement("span", { id: "query" }, query),
      );
    }

    const container = document.createElement("div");
    const instance = new FunctionComponent(App);

    instance.mount(container);
    updateQuery("memo");
    updateLeft(2);

    expect(computeCounts).toEqual({
      left: 2,
      right: 1,
    });
    expect(container.querySelector("#value-left")?.textContent).toBe("4");
    expect(container.querySelector("#value-right")?.textContent).toBe("20");
  });
});
