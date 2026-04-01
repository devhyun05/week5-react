// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { FunctionComponent } from "../../src/runtime/FunctionComponent.js";
import { App } from "../../src/app/App.js";

async function flushMicrotask() {
  await Promise.resolve();
}

describe("Todo app", () => {
  it("입력 후 추가 버튼을 누르면 목록에 새 todo가 렌더링된다", async () => {
    localStorage.clear();

    const container = document.createElement("div");
    const root = new FunctionComponent(App);

    root.mount(container);

    const input = container.querySelector('[data-testid="draft-input"]');
    const addButton = container.querySelector('[data-testid="add-button"]');

    input.value = "새로운 할 일";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotask();
    addButton.click();
    await flushMicrotask();

    expect(container.textContent).toContain("새로운 할 일");
  });

  it("undo와 redo가 snapshot을 기준으로 동작한다", async () => {
    localStorage.clear();

    const container = document.createElement("div");
    const root = new FunctionComponent(App);

    root.mount(container);

    const input = container.querySelector('[data-testid="draft-input"]');
    const addButton = container.querySelector('[data-testid="add-button"]');
    const undoButton = container.querySelector('[data-testid="undo-button"]');
    const redoButton = container.querySelector('[data-testid="redo-button"]');

    input.value = "history test";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await flushMicrotask();
    addButton.click();
    await flushMicrotask();

    expect(container.textContent).toContain("history test");

    undoButton.click();
    await flushMicrotask();

    expect(container.textContent).not.toContain("history test");

    redoButton.click();
    await flushMicrotask();

    expect(container.textContent).toContain("history test");
  });
});
