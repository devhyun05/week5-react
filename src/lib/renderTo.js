import { vdomToDom } from "./vdomToDom.js";

/**
 * 담당: 위승철
 *
 * vdom을 실제 DOM으로 변환한 뒤, container의 자식을 통째로 교체한다.
 *
 * replaceChildren을 쓰기 때문에 기존에 container 안에 있던 DOM은 전부 날아가고
 * 새로 만든 DOM 하나로 대체된다.
 *
 * @param {Element} container - 렌더링 대상이 될 부모 DOM 엘리먼트 (예: document.getElementById("root"))
 * @param {object}  vdom      - 화면에 그릴 Virtual DOM 트리
 */
export function renderTo(container, vdom) {
  // vdom → 실제 DOM 변환
  const nextDom = vdomToDom(vdom);

  // container 안을 비우고 새 DOM으로 교체
  container.replaceChildren(nextDom);
}
