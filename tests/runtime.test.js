// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { FunctionComponent, h, useEffect, useMemo, useState } from "../src/runtime.js";

function flushUpdates() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe("FunctionComponent runtime", () => {
  it("useState 변경 후 diff와 patch로 DOM을 갱신한다", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.querySelector("#root");
    const api = {};
    const renderLog = [];

    function App() {
      const [count, setCount] = useState(0);
      const [label, setLabel] = useState("alpha");

      api.setCount = setCount;
      api.setLabel = setLabel;
      renderLog.push(`${count}:${label}`);

      return h("section", { className: "shell" }, [
        h("span", { id: "count" }, count),
        h("strong", { id: "label" }, label),
      ]);
    }

    const component = new FunctionComponent(App);
    component.mount(root);

    const countNode = root.querySelector("#count");
    const labelNode = root.querySelector("#label");

    api.setCount(3);
    api.setLabel("beta");
    await flushUpdates();

    expect(root.querySelector("#count")).toBe(countNode);
    expect(root.querySelector("#label")).toBe(labelNode);
    expect(root.textContent).toBe("3beta");
    expect(component.renderCount).toBe(2);
    expect(renderLog).toEqual(["0:alpha", "3:beta"]);
  });

  it("useMemo는 dependency가 그대로면 이전 계산 결과를 재사용한다", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.querySelector("#root");
    const api = {};
    let computeCount = 0;

    function App() {
      const [count, setCount] = useState(1);
      const [theme, setTheme] = useState("warm");

      api.setCount = setCount;
      api.setTheme = setTheme;

      const doubled = useMemo(() => {
        computeCount += 1;
        return count * 2;
      }, [count]);

      return h("div", {}, [
        h("span", { id: "value" }, doubled),
        h("span", { id: "theme" }, theme),
      ]);
    }

    new FunctionComponent(App).mount(root);

    expect(computeCount).toBe(1);

    api.setTheme("cool");
    await flushUpdates();
    expect(computeCount).toBe(1);

    api.setCount(4);
    await flushUpdates();
    expect(computeCount).toBe(2);
    expect(root.querySelector("#value")?.textContent).toBe("8");
  });

  it("useEffect는 dependency 변경 시 cleanup 후 다시 실행된다", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const root = document.querySelector("#root");
    const api = {};
    const calls = [];

    function App() {
      const [status, setStatus] = useState("idle");
      api.setStatus = setStatus;

      useEffect(() => {
        calls.push(`effect:${status}`);

        return () => {
          calls.push(`cleanup:${status}`);
        };
      }, [status]);

      return h("div", {}, status);
    }

    new FunctionComponent(App).mount(root);
    expect(calls).toEqual(["effect:idle"]);

    api.setStatus("done");
    await flushUpdates();

    expect(calls).toEqual(["effect:idle", "cleanup:idle", "effect:done"]);
  });
});
