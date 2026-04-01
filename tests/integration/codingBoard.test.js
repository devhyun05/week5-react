// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  mountCodingBoard,
} from "../../src/app/mountCodingBoard.js";

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function changeValue(element, value, type = "input") {
  element.value = value;
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

function click(element) {
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function getTaskCards(root) {
  return Array.from(root.querySelectorAll("[data-task-card]"));
}

describe("수요 코딩회 보드", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createMemoryStorage(),
      configurable: true,
    });
    document.body.innerHTML = `
      <div id="app-root"></div>
      <div id="debug-root"></div>
    `;
    localStorage.clear();
    document.title = "before";
  });

  afterEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("초기 렌더에서 요약 카드, 작업 카드, 디버그 패널을 보여준다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    expect(appRoot.querySelector("h1")?.textContent).toContain("수요 코딩회");
    expect(getTaskCards(appRoot).length).toBeGreaterThan(0);
    expect(debugRoot.textContent).toContain("Render Count");
    expect(document.title).toContain("남은 작업");
  });

  it("새 작업을 추가하고 완료 처리하면 요약, title, localStorage, debug 패널이 함께 갱신된다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    changeValue(appRoot.querySelector("#task-title-input"), "API 문서 정리");
    changeValue(appRoot.querySelector("#task-team-select"), "플랫폼", "change");
    changeValue(appRoot.querySelector("#task-priority-select"), "high", "change");
    click(appRoot.querySelector("#add-task-button"));

    const addedCard = getTaskCards(appRoot).find((card) =>
      card.textContent.includes("API 문서 정리"),
    );

    expect(addedCard).toBeTruthy();
    click(addedCard.querySelector("[data-toggle-task]"));

    expect(appRoot.querySelector("#summary-total")?.textContent).not.toBe("0");
    expect(document.title).toContain("남은 작업");
    expect(localStorage.getItem(STORAGE_KEY)).toContain("API 문서 정리");
    expect(debugRoot.textContent).toContain("ADD");
  });

  it("팀 필터, 상태 필터, 검색, 정렬을 조합해 표시 목록을 바꾼다", () => {
    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    changeValue(appRoot.querySelector("#team-filter-select"), "플랫폼", "change");
    changeValue(appRoot.querySelector("#status-filter-select"), "todo", "change");
    changeValue(appRoot.querySelector("#search-input"), "발표");
    changeValue(appRoot.querySelector("#sort-select"), "priority", "change");

    const cards = getTaskCards(appRoot);

    expect(cards).toHaveLength(1);
    expect(cards[0].textContent).toContain("발표");
    expect(debugRoot.textContent).toContain("memo");
  });

  it("localStorage에 저장된 작업이 있으면 그 값으로 시작한다", () => {
    const savedTasks = [
      {
        id: "saved-1",
        title: "저장된 작업",
        team: "플랫폼",
        priority: "medium",
        done: false,
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTasks));

    const appRoot = document.querySelector("#app-root");
    const debugRoot = document.querySelector("#debug-root");

    mountCodingBoard({ appRoot, debugRoot });

    expect(getTaskCards(appRoot)).toHaveLength(1);
    expect(appRoot.textContent).toContain("저장된 작업");
    expect(debugRoot.textContent).toContain("Render Count");
  });
});
