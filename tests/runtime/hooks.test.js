// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { FunctionComponent } from "../../src/runtime/FunctionComponent.js";
import { h } from "../../src/runtime/h.js";
import { useEffect, useMemo, useState } from "../../src/runtime/hooks.js";

async function flushMicrotask() {
  await Promise.resolve();
}

describe("mini runtime hooks", () => {
  it("useState가 상태를 유지하고 patch 기반으로 화면을 갱신한다", async () => {
    const container = document.createElement("div");
    let increment;

    function App() {
      const [count, setCount] = useState(0);

      increment = () => setCount((previousCount) => previousCount + 1);

      return h("section", { "data-count": String(count) }, String(count));
    }

    const root = new FunctionComponent(App);
    root.mount(container);
    const firstDom = container.firstChild;

    increment();
    await flushMicrotask();

    expect(container.textContent).toBe("1");
    expect(container.firstChild).toBe(firstDom);
    expect(container.firstChild?.getAttribute("data-count")).toBe("1");
  });

  it("useEffect가 deps 변경 시 cleanup 후 다시 실행된다", async () => {
    const container = document.createElement("div");
    const effectLog = [];
    let setValue;

    function App() {
      const [value, setStateValue] = useState(0);
      setValue = setStateValue;

      useEffect(() => {
        effectLog.push(`run:${value}`);

        return () => {
          effectLog.push(`cleanup:${value}`);
        };
      }, [value]);

      return h("div", {}, String(value));
    }

    const root = new FunctionComponent(App);
    root.mount(container);

    setValue(1);
    await flushMicrotask();

    expect(effectLog).toEqual(["run:0", "cleanup:0", "run:1"]);
  });

  it("useMemo가 deps가 같으면 이전 계산 결과를 재사용한다", async () => {
    const container = document.createElement("div");
    const calculate = vi.fn((count) => count * 2);
    let setFlag;

    function App() {
      const [count] = useState(2);
      const [flag, setNextFlag] = useState(false);
      setFlag = setNextFlag;

      const doubled = useMemo(() => calculate(count), [count]);

      return h("div", { "data-flag": String(flag) }, String(doubled));
    }

    const root = new FunctionComponent(App);
    root.mount(container);

    setFlag(true);
    await flushMicrotask();

    expect(calculate).toHaveBeenCalledTimes(1);
    expect(container.textContent).toBe("4");
  });

  it("자식 컴포넌트에서 Hook을 사용하면 예외를 던진다", () => {
    const container = document.createElement("div");

    function Child() {
      useState(0);
      return h("div", {}, "bad");
    }

    function App() {
      return h("section", {}, h(Child, {}));
    }

    const root = new FunctionComponent(App);

    expect(() => root.mount(container)).toThrow(
      /Hooks can only be used in the root component/,
    );
  });
});
