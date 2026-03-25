import { NodeType } from "../constants.js";

/**
 * setAttribute에 넣을 수 있는 값인지 확인한다.
 * string과 number만 허용 (boolean, object, undefined 등은 제외)
 */
function isSupportedPropValue(value) {
  return typeof value === "string" || typeof value === "number";
}

/**
 * 담당: 위승철
 *
 * Virtual DOM(vdom) 객체를 실제 DOM 노드로 변환한다. domToVdom의 반대 방향.
 *
 * - 텍스트 노드면 → document.createTextNode("텍스트 내용") 반환
 * - 엘리먼트 노드면 → createElement로 태그 생성 후, 속성 주입 → 자식들도 재귀 변환해서 붙임
 * - 둘 다 아니면 → TypeError 던짐 (잘못된 vnode가 들어온 것)
 */
export function vdomToDom(vnode) {
  // 텍스트 노드: DOM TextNode로 만들어서 반환
  if (vnode?.nodeType === NodeType.TEXT) {
    return document.createTextNode(vnode.value ?? "");
  }

  // 엘리먼트 노드: 태그명으로 DOM 엘리먼트 생성
  if (vnode?.nodeType === NodeType.ELEMENT) {
    const element = document.createElement(vnode.type);

    // props 객체의 각 항목을 DOM 어트리뷰트로 세팅
    // string/number 이외의 값(함수, null 등)은 setAttribute에 넣을 수 없어서 걸러냄
    for (const [name, value] of Object.entries(vnode.props ?? {})) {
      if (isSupportedPropValue(value)) {
        element.setAttribute(name, String(value));
      }
    }

    // 자식 vnode들을 재귀 변환해서 현재 엘리먼트에 붙임
    for (const child of vnode.children ?? []) {
      element.appendChild(vdomToDom(child));
    }

    return element;
  }

  throw new TypeError("Unsupported vnode.");
}
