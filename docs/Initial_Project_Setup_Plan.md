# 새 프로젝트 초기 구성 계획

이 문서는 새 프로젝트를 시작할 때 필요한 최소 계획만 정리한다.

목표:

- `src/constants.js`를 유지한다.
- 공개 시그니처만 먼저 고정한다.
- 구현 본문은 비워 두고, 파일 구조와 진입점만 세팅한다.
- Vite로 실행 코드와 테스트 코드를 붙일 수 있는 초기 상태를 만든다.

## 1. 시작 명령

```bash
 npm create vite@latest dom-vdom -- --template vanilla
 cd dom-vdom
npm install
npm install -D vitest jsdom
```

## 2. 초기 파일 구조

```text
index.html
package.json
src/
  constants.js
  history.js
  lib/
    domToVdom.js
    vdomToDom.js
    renderTo.js
    diff.js
    applyPatches.js
  lib.js
tests/
  lib/
    domToVdom.test.js
    vdomToDom.test.js
    renderTo.test.js
    diff.test.js
    applyPatches.test.js
  history.test.js
```

## 3. `package.json` 기준

```json
{
  "name": "dom-vdom",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  }
}
```

## 4. `src/constants.js`

이 파일은 실제 구현을 시작하기 전에 먼저 고정한다.

```js
export const NodeType = Object.freeze({
  TEXT: "TEXT_NODE",
  ELEMENT: "ELEMENT_NODE",
});

/**
 * 담당: 위승철
 */
export function textNode(value) {
  return { nodeType: NodeType.TEXT, value };
}

/**
 * 담당: 위승철
 */
export function elementNode(type, props = {}, children = []) {
  return { nodeType: NodeType.ELEMENT, type, props, children };
}

export const PatchType = Object.freeze({
  TEXT: "TEXT",
  REPLACE: "REPLACE",
  PROPS: "PROPS",
  ADD: "ADD",
  REMOVE: "REMOVE",
});
```

## 5. `src/lib/` 기능별 시그니처

`lib.js`에 모든 구현을 몰아넣지 않고 기능별 파일로 나눈다.

`src/lib/domToVdom.js`

```js
/**
 * 담당: 위승철
 */
export function domToVdom(domNode) {
  // TODO
}
```

`src/lib/vdomToDom.js`

```js
/**
 * 담당: 위승철
 */
export function vdomToDom(vnode) {
  // TODO
}
```

`src/lib/renderTo.js`

```js
/**
 * 담당: 위승철
 */
export function renderTo(container, vdom) {
  // TODO
}
```

`src/lib/diff.js`

```js
/**
 * 담당: 이진혁
 */
export function diff(oldVdom, newVdom) {
  // TODO
}
```

`src/lib/applyPatches.js`

```js
/**
 * 담당: 이진혁
 */
export function applyPatches(rootDom, patches) {
  // TODO
}
```

## 6. `src/lib.js` 집합 진입점

`src/lib.js`는 기능별 파일을 다시 모아 외부에 공개하는 집합 진입점으로만 둔다.

```js
export { NodeType, PatchType, textNode, elementNode } from "./constants.js";
export { domToVdom } from "./lib/domToVdom.js";
export { vdomToDom } from "./lib/vdomToDom.js";
export { renderTo } from "./lib/renderTo.js";
export { diff } from "./lib/diff.js";
export { applyPatches } from "./lib/applyPatches.js";
```

## 7. `src/history.js` 시그니처

```js
/**
 * 담당: 양시준
 */
export function createHistory(initialVdom) {
  // TODO
}
```

원하면 나중에 아래 형태로 확장한다.

```js
{
  push(vdom) {},
  current() {},
  back() {},
  forward() {},
  canBack() {},
  canForward() {},
  entries() {},
  currentIndex() {},
}
```

## 8. `tests/` 초기 구성

테스트 코드는 `src` 바깥의 별도 `tests/` 폴더에서 관리한다.

- `tests/lib/domToVdom.test.js`는 `src/lib/domToVdom.js`를 본다.
- `tests/lib/vdomToDom.test.js`는 `src/lib/vdomToDom.js`를 본다.
- `tests/lib/renderTo.test.js`는 `src/lib/renderTo.js`를 본다.
- `tests/lib/diff.test.js`는 `src/lib/diff.js`를 본다.
- `tests/lib/applyPatches.test.js`는 `src/lib/applyPatches.js`를 본다.
- `tests/history.test.js`는 `src/history.js`를 본다.

담당자 기준은 아래처럼 맞춘다.

- 위승철: `domToVdom`, `vdomToDom`, `renderTo`
- 이진혁: `diff`, `applyPatches`
- 양시준: `createHistory`, 데모 UI

각 담당자는 자기 범위 파일 이름에 맞는 테스트 파일을 직접 추가하고 확장한다.

- 테스트 파일 이름은 대상 소스 파일 이름에 `.test.js`를 붙여 맞춘다.
- 공용 테스트 파일 하나에 모두 몰아넣지 않는다.
- `src/lib.js` 자체는 집합 진입점이므로 전용 테스트 대상이라기보다 개별 기능 파일 테스트를 통해 검증한다.

## 9. `index.html` 초기 구성

- 담당: 양시준
- 데모 UI 범위는 `index.html`, CSS 구성까지 포함한다.
- 별도 `src/main.js`는 두지 않는다.
- `index.html`에서 `src/lib.js`를 직접 모듈로 연결해 사용한다.
- 이 문서에는 그 연결 방식에 대한 예시 코드는 포함하지 않는다.

## 10. 구현 시작 순서

1. `constants.js`
2. `src/lib/` 아래 기능별 파일 시그니처 작성
3. `src/lib.js`에서 공개 export 연결
4. `vdomToDom`
5. `domToVdom`
6. `renderTo`
7. `diff`
8. `applyPatches`
9. `history.js`
10. 파일별 테스트 보강

## 11. 이 문서의 범위

이 문서는 아래만 다룬다.

- 어떤 파일이 필요한지
- 어떤 함수 시그니처를 먼저 만들지
- Vite에서 어떤 명령으로 시작할지

이 문서는 아래는 다루지 않는다.

- 각 함수의 상세 동작 규칙
- 패치 알고리즘 세부 요구사항
- 구현 제약과 예외 케이스 정리
