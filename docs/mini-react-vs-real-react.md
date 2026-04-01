# Mini React vs Real React 심층 비교 보고서

## 1. 문서 목적

이 문서는 이번 주 프로젝트에 구현한 React-like 런타임이 실제 React와 어떤 점에서 닮았고, 어떤 점에서 구조적으로 다른지 코드 기준으로 깊게 비교하기 위해 작성했다.

핵심 질문은 다음 3가지다.

1. 이번 프로젝트는 어디까지가 "React를 흉내 낸 부분"이고, 어디부터가 전혀 다른 아키텍처인가?
2. 실제 React와의 차이는 단순한 기능 누락이 아니라, 어떤 실행 모델 차이에서 발생하는가?
3. 지금 구현이 학습용으로 특히 잘 보여주는 개념과, 반대로 실제 React를 오해하게 만들 수 있는 지점은 무엇인가?

비교 기준으로 사용한 실제 React 정보는 공식 문서 `react.dev` 기준이며, 확인 시점의 문서 버전 표기는 `react@19.2`였다.

## 2. 조사 범위

### 프로젝트 코드

- `src/runtime/index.js`
- `src/lib/diff.js`
- `src/lib/applyPatches.js`
- `src/lib/domProps.js`
- `src/lib/renderTo.js`
- `src/app/mountCodingBoard.js`
- `src/app/codingBoardApp.js`

### 프로젝트 테스트

- `tests/runtime/*.test.js`
- `tests/integration/codingBoard.test.js`
- `tests/lib/edgeCases.test.js`

### 실제 React 비교 기준

- [createElement](https://react.dev/reference/react/createElement)
- [useState](https://react.dev/reference/react/useState)
- [useEffect](https://react.dev/reference/react/useEffect)
- [useMemo](https://react.dev/reference/react/useMemo)
- [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Render and Commit](https://react.dev/learn/render-and-commit)
- [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [Common components / React event object](https://react.dev/reference/react-dom/components/common)
- [createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [StrictMode](https://react.dev/reference/react/StrictMode)
- [React 18 overview / concurrent renderer](https://react.dev/blog/2022/03/29/react-v18)

## 3. 먼저 결론

이 프로젝트는 "React API 일부를 빌린 단일 루트 VDOM 런타임"에 가깝다. 표면 API는 `createElement`, `useState`, `useEffect`, `useMemo`, 함수형 컴포넌트를 제공하므로 React처럼 보인다. 하지만 내부 실행 모델은 실제 React와 상당히 다르다.

가장 큰 차이는 이것이다.

- 이 프로젝트는 루트 `FunctionComponent` 인스턴스 하나가 모든 hook slot과 렌더링 책임을 가진다.
- 실제 React는 컴포넌트 트리 전체를 별도 자료구조로 관리하고, 각 컴포넌트 위치마다 독립적인 상태와 생명주기를 가진다.

즉, 이번 구현은 "React의 핵심 감각" 일부를 잘 보여주지만, 실제 React의 핵심 아키텍처인 컴포넌트 트리, 상태 소유권, 스케줄링, key 기반 identity, root API, effect lifecycle 전체를 구현한 것은 아니다.

## 4. 현재 프로젝트의 실제 실행 모델

현재 런타임을 코드 흐름으로 줄이면 다음과 같다.

1. `createElement`가 JSX 대체 함수처럼 VNode를 만든다. `type`이 함수면 즉시 실행한다. (`src/runtime/index.js:128-143`)
2. 루트는 `new FunctionComponent(BoardRoot).mount(appRoot)`로 시작한다. (`src/app/mountCodingBoard.js:100-111`)
3. `BoardRoot` 안의 모든 `useState`, `useMemo`, `useEffect`는 하나의 `hooks[]` 배열에 저장된다. (`src/runtime/index.js:146-160`, `285-347`)
4. 상태가 바뀌면 setter가 `instance.update()`를 즉시 호출한다. (`src/runtime/index.js:293-314`)
5. `update()`는 `renderComponent()`로 새 VNode를 만들고, `diff()`로 patch를 계산한 뒤 `applyPatches()`로 실제 DOM에 반영한다. (`src/runtime/index.js:179-205`)
6. DOM 반영 후 `flushEffects()`가 동기적으로 effect를 실행한다. (`src/runtime/index.js:223-243`)

앱 레벨에서도 이 모델은 매우 분명하다.

- 모든 상태는 `BoardRoot`에 몰려 있다. (`src/app/mountCodingBoard.js:19-47`)
- 자식 컴포넌트들인 `Header`, `SummaryCards`, `TaskCard` 등은 전부 순수 렌더 함수다. (`src/app/codingBoardApp.js`)

즉, "컴포넌트 트리 전체가 상태를 나눠 갖는 시스템"이 아니라, "루트 하나가 상태를 전부 갖고 아래는 함수 호출로 렌더링하는 시스템"이다.

## 5. 가장 중요한 차이 1: element와 component의 의미가 다르다

### 현재 프로젝트

현재 `createElement`는 함수형 컴포넌트를 "element description"으로 남겨두지 않는다. 바로 실행한다.

- `typeof type === "function"`이면 즉시 `type(props)`를 호출한다. (`src/runtime/index.js:132-140`)
- 반환값은 바로 VNode여야 한다. 아니면 에러다. (`src/runtime/index.js:51-60`)

이 결정의 결과는 크다.

- 트리 안에 "컴포넌트 노드"가 남지 않는다.
- 런타임은 최종적으로 HTML 태그 기반 VNode만 본다.
- 자식 컴포넌트는 독립적인 인스턴스나 생명주기를 갖지 못한다.

### 실제 React

실제 React의 [`createElement`](https://react.dev/reference/react/createElement)는 컴포넌트를 즉시 실행하지 않고 "React element object"를 만든다.

- element는 `type`, `props`, `key`, `ref`를 가진다.
- element는 opaque/immutable하게 취급된다.
- 함수 컴포넌트는 reconciliation/render 단계에서 React가 호출한다.

이 차이 때문에 실제 React는 컴포넌트 경계를 보존할 수 있고, 각 컴포넌트에 state/effect/memo/ref/error boundary 등을 독립적으로 붙일 수 있다.

### 여기서 생기는 구체적 차이

1. `key`와 `ref`

- 실제 React에서는 `key`와 `ref`가 특수 필드다.
- 현재 프로젝트에서는 `key`, `ref`를 전혀 특별 취급하지 않는다. (`src/runtime/index.js:128-143`)
- 따라서 `key`를 넘기면 reconciliation identity에 쓰이지 않고 그냥 일반 prop처럼 흘러간다.
- DOM에 내려가는 경우 `setAttribute("key", ...)`처럼 실제 속성으로 붙을 수도 있다. 이건 실제 React와 정반대다.

2. 반환값 제약

- 실제 React 컴포넌트는 `null`, 배열, fragment, portal 등 다양한 React node를 반환할 수 있다.
- 현재 구현은 VNode, 문자열, 숫자 외의 반환값을 허용하지 않는다. (`src/runtime/index.js:51-60`)

즉, 지금 구현의 `createElement`는 React element 생성기라기보다 "최종 VNode를 빨리 만들어내는 함수"에 더 가깝다.

## 6. 가장 중요한 차이 2: state 소유권이 루트 하나에만 있다

### 현재 프로젝트

hook 저장소는 `FunctionComponent` 인스턴스의 `hooks` 배열 하나다. (`src/runtime/index.js:151`, `286`, `320`, `336`)

hook 호출 위치는 아래 전역 컨텍스트로 추적한다.

- `currentInstance`
- `hookIndex`
- `componentDepth`

(`src/runtime/index.js:8-12`)

그리고 훅 접근은 이렇게 막는다.

- 루트 렌더 중이 아니면 에러
- `componentDepth !== 0`이면 에러

(`src/runtime/index.js:85-92`)

실제로 테스트도 자식 컴포넌트에서 훅을 쓰면 실패한다고 못 박고 있다.

- `tests/runtime/useState.test.js:52-68`
- `tests/runtime/useEffect.test.js:42-58`
- `tests/runtime/useMemo.test.js:44-58`

### 실제 React

실제 React는 state를 "루트 하나"에 붙이지 않는다. 공식 문서의 표현대로 state는 "render tree에서의 위치"에 묶인다.

- React는 같은 컴포넌트가 같은 위치에 있으면 state를 보존한다.
- `key`나 type이 바뀌면 state를 리셋할 수 있다.

참고: [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)

### 이 차이가 만드는 결과

현재 프로젝트에서는:

- 자식 컴포넌트에 local state를 둘 수 없다.
- 컴포넌트 추출은 재사용성보다 "뷰 함수 분리"에 가깝다.
- 상태 분산 설계, lifting state up, context, reducer 분리 같은 React식 구조화가 불가능하다.

실제 React에서는:

- `TaskCard` 같은 자식도 자체 `useState`를 가질 수 있다.
- 같은 부모 아래에서도 각 자식은 자기 state를 별도로 가진다.
- custom hook과 child component 조합으로 상태 로직을 계층적으로 분산할 수 있다.

즉, 현재 프로젝트는 React의 "컴포넌트 기반 상태 소유권" 대신 "루트 단일 저장소" 모델을 택했다.

## 7. 가장 중요한 차이 3: hook 규칙은 비슷해 보여도 실제 의미는 다르다

### 공통점

현재 프로젝트도 실제 React처럼 "호출 순서"로 hook slot을 식별한다.

- `getHook()`이 `hookIndex`를 읽고 증가시킨다. (`src/runtime/index.js:94-114`)
- hook kind가 달라지면 `Hook order mismatch` 에러를 던진다. (`src/runtime/index.js:109-110`)

이 부분은 실제 React의 핵심 아이디어와 가장 닮아 있다.

### 차이점

실제 React의 [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)는 다음을 허용한다.

- function component 안에서 top-level hook 호출
- custom hook 안에서 top-level hook 호출

반면 현재 프로젝트는:

- child component 훅 호출을 의도적으로 금지한다.
- lint, compiler, dev warning 체계가 없다.
- "훅은 루트 컴포넌트에서만"이라는 과제 제약을 런타임 에러로 강제한다.

즉, 현재 구현의 hook 규칙은 "React의 일반 규칙"이 아니라 "루트 단일 인스턴스 모델을 유지하기 위한 규칙"이다.

## 8. 가장 중요한 차이 4: `setState`의 의미가 다르다

### 현재 프로젝트

`useState` setter는 다음 순서로 동작한다.

1. next value 계산
2. 현재 `hook.value`와 `Object.is` 비교
3. 다르면 `hook.value`를 즉시 바꿈
4. `instance.update()`를 즉시 호출
5. 새 값을 반환

(`src/runtime/index.js:293-314`)

README도 이 특성을 명시한다.

- batching 없음
- 성공한 `setState`마다 루트 `update()` 1회 실행

(`README.md`)

### 실제 React

[useState 공식 문서](https://react.dev/reference/react/useState)에 따르면 실제 React의 setter는:

- 업데이트를 queue에 넣는다.
- 현재 실행 중인 코드의 state 값을 즉시 바꾸지 않는다.
- return value가 없다.
- 자동 batching을 수행한다.

또한 React는 같은 이벤트 안의 여러 state update를 묶어서 처리한다.

참고:

- [useState](https://react.dev/reference/react/useState)
- [Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)

### 차이를 한 문장으로 요약하면

- 현재 프로젝트의 setter는 "상태를 즉시 바꾸고 즉시 다시 렌더하는 함수"다.
- 실제 React의 setter는 "다음 렌더를 요청하는 enqueue 함수"다.

### 이 차이가 낳는 결과

1. 렌더 횟수

- 현재 프로젝트는 `setState`를 연달아 여러 번 호출하면 그만큼 여러 번 렌더될 가능성이 높다.
- 실제 React는 같은 이벤트 안의 여러 업데이트를 batching한다.

2. 반환값

- 현재 setter는 새 값을 반환한다.
- 실제 React setter는 `undefined`를 반환한다.

3. 상태 snapshot 의미

- 실제 React는 "state is a snapshot" 문서를 통해 현재 실행 중인 코드에서는 예전 state를 본다고 설명한다.
- 현재 구현도 렌더 클로저는 이전 값을 잡고 있을 수 있지만, 내부 저장소 `hook.value`는 이미 즉시 바뀐다.

즉, 겉으로는 비슷한 `setState` API지만, 내부 의미는 상당히 다르다.

## 9. 가장 중요한 차이 5: reconciliation이 index 기반이다

### 현재 프로젝트

`diffChildren()`은 children을 같은 인덱스끼리만 비교한다. (`src/lib/diff.js:88-99`)

즉:

- 첫 번째 옛 자식 vs 첫 번째 새 자식
- 두 번째 옛 자식 vs 두 번째 새 자식

이 구조에는 key 개념이 없다.

### 테스트가 보여주는 현재 동작

`tests/lib/edgeCases.test.js`는 이 차이를 매우 잘 드러낸다.

1. 앞쪽 삽입

- 앞에 새 항목을 끼우면 뒤 형제를 "같은 노드 재사용"이 아니라 prop/text 수정 + 뒤쪽 ADD로 처리한다.
- 테스트가 뒤 형제 identity가 재사용되지 않는다고 확인한다. (`tests/lib/edgeCases.test.js:240-295`)

2. 형제 reorder

- `A, B`를 `B, A`로 바꿔도 node move가 아니라 텍스트 patch 두 개로 처리한다.
- DOM node identity는 그대로 남는다. (`tests/lib/edgeCases.test.js:297-334`)

### 실제 React

실제 React는 type, position, key를 바탕으로 identity를 추적한다.

- 같은 위치와 같은 type이면 state를 보존한다.
- key는 reorder나 reset 여부를 결정하는 핵심 힌트다.
- 리스트 렌더링에서 key는 선택이 아니라 identity 계약이다.

참고:

- [Rendering Lists](https://react.dev/learn/rendering-lists)
- [Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)

### 왜 이 차이가 중요한가

현재 구현에서는 reorder를 해도 "어느 항목이 같은 개체인가"를 이해하지 못한다.

실제 React에서는 key가 있으면:

- 항목 이동과 재사용을 더 정확히 판단할 수 있고
- 각 child component의 local state를 올바르게 보존/리셋할 수 있다.

반면 지금 구현은 local state child가 아예 없기 때문에 이 약점이 덜 드러난다. 하지만 실제 React에 가까워질수록 key 없는 index diff는 곧바로 구조적 한계가 된다.

## 10. 가장 중요한 차이 6: effect lifecycle이 단순화되어 있다

### 현재 프로젝트

`useEffect`는 deps가 바뀌면 `pendingEffects`에 등록되고, `update()` 끝에서 `flushEffects()`가 곧바로 실행된다. (`src/runtime/index.js:223-243`, `319-333`)

지원하는 것은 다음 정도다.

- deps 비교
- 재실행 전 cleanup
- effect log

테스트도 이 범위를 검증한다. (`tests/runtime/useEffect.test.js:12-40`)

### 현재 구현에서 없는 것

1. unmount cleanup API

- `FunctionComponent`에 `unmount()`가 없다.
- root가 사라질 때 effect cleanup을 보장하는 경로가 없다.
- child component effect 자체가 불가능하므로 subtree 단위 정리도 없다.

2. effect 종류 구분

- `useLayoutEffect`, `useInsertionEffect`가 없다.
- 모든 effect가 하나의 동기 flush 경로로 처리된다.

3. StrictMode 검증

- 개발 모드에서 setup -> cleanup -> setup을 한 번 더 돌리는 검증이 없다.

### 실제 React

[useEffect](https://react.dev/reference/react/useEffect) 문서 기준 실제 React는:

- commit 이후 effect를 실행한다.
- deps가 바뀌면 old cleanup 후 새 setup을 실행한다.
- unmount 시 cleanup을 실행한다.
- Strict Mode에서 개발 중 extra setup/cleanup cycle로 버그를 드러낸다.
- server rendering에서는 effect가 실행되지 않는다.

### 핵심 해석

현재 구현의 `useEffect`는 "렌더 후 side effect 실행"이라는 학습 포인트는 잘 보여준다. 하지만 실제 React의 effect lifecycle 전체, 특히 unmount/StrictMode/server/client 구분까지는 포함하지 않는다.

## 11. 가장 중요한 차이 7: `useMemo`의 의미도 더 강하게 구현되어 있다

### 현재 프로젝트

`useMemo`는 deps가 같으면 저장된 값을 그대로 반환하고, deps가 다르면 다시 계산한다. (`src/runtime/index.js:335-347`)

이 캐시는 사실상:

- root instance가 살아 있는 동안
- deps가 바뀌지 않는 한

유지된다.

### 실제 React

[useMemo](https://react.dev/reference/react/useMemo) 문서는 `useMemo`를 "성능 최적화"로 설명한다.

- deps가 같으면 cached value를 재사용한다.
- 하지만 React는 특정 상황에서 cache를 버릴 수 있다.
- Strict Mode에서는 계산 함수를 두 번 호출할 수 있다.

즉, 실제 React의 `useMemo`는 semantic storage가 아니라 optimization hint에 가깝다.

### 차이가 중요한 이유

현재 구현만 보고 배우면 `useMemo`를 "값 보관 장치"처럼 느끼기 쉽다. 그러나 실제 React에서는 `useMemo`가 없어도 코드 의미는 유지되어야 하고, 있어도 언제나 절대적인 보관을 약속하지 않는다.

이건 학습상 매우 중요한 차이다.

## 12. 가장 중요한 차이 8: DOM prop과 이벤트 시스템이 React DOM이 아니다

### 현재 프로젝트

DOM prop 반영은 `setDomProp()`이 직접 처리한다. (`src/lib/domProps.js:1-39`)

핵심 특징:

- `class` -> `className` 정도만 정규화
- event prop이면 `element[property] = handler`
- 나머지는 property 또는 attribute 직접 대입

즉, 브라우저 DOM API를 거의 바로 만진다.

### 실제 React

실제 React DOM은 단순 `elem.onclick = ...` 래퍼가 아니다.

- React event object는 synthetic event다.
- React는 내부적으로 root에 event handler를 붙인다.
- form 요소는 controlled/uncontrolled 동작이 별도로 설계되어 있다.
- `ref`, `dangerouslySetInnerHTML`, portal, metadata/title, hydration 등 React DOM만의 동작이 많다.

참고:

- [Common components / React event object](https://react.dev/reference/react-dom/components/common)
- [React DOM Components](https://react.dev/reference/react-dom/components)

### 프로젝트 코드에서 드러나는 구체적 차이

1. synthetic event 부재

- 현재는 브라우저 native event를 그대로 받는다.
- 실제 React는 synthetic event를 준다.

2. root delegation 부재

- 현재는 노드별 직접 바인딩이다.
- 실제 React는 root delegation을 사용한다.

3. 이벤트 명세 범위가 좁다

- 현재 구현은 `on*` prop을 소문자로 바꿔 DOM property에 꽂는 방식이다. (`src/lib/domProps.js:3-15`)
- 따라서 React가 제공하는 event abstraction 전체를 재현하지 않는다.

4. form 제어 모델 차이

- 실제 React의 `<input>`, `<select>`, `<textarea>`는 controlled component 규칙이 있다.
- 현재 구현은 일반 prop 대입 수준이다.

### 코드상 추론: style patch는 React와 다르게 동작할 가능성이 높다

이 부분은 테스트로 직접 고정된 요구사항은 아니지만, 소스상 다음 차이가 보인다.

- `diffProps()`는 style object를 깊게 diff하지 않고 참조 비교만 한다. (`src/lib/diff.js:101-113`)
- style prop이 바뀌면 `Object.assign(element.style, value)`만 수행한다. (`src/lib/domProps.js:8-10`)

따라서 이전 style object에 있던 속성이 새 style object에서 빠진 경우, stale style이 DOM에 남을 수 있다. 실제 React DOM은 style 변경을 더 세밀하게 관리한다.

## 13. 가장 중요한 차이 9: root API와 renderer 책임 범위가 다르다

### 현재 프로젝트

루트 시작 API는 사실상 아래 형태다.

```js
const instance = new FunctionComponent(BoardRoot)
instance.mount(container)
```

(`src/app/mountCodingBoard.js:100-111`)

그리고 여기에는 다음이 없다.

- `createRoot`
- `hydrateRoot`
- `root.render`
- `root.unmount`
- portal
- error boundary 기반 root error handling

### 실제 React

실제 React DOM client API는:

- `createRoot(domNode)`
- `root.render(reactNode)`
- `root.unmount()`
- SSR 시 `hydrateRoot(domNode, reactNode)`

를 제공한다.

참고:

- [createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)

즉, 현재 프로젝트는 "루트 인스턴스 클래스"를 직접 노출하는 학습용 구조이고, 실제 React는 root 관리 API와 renderer를 더 분리한다.

## 14. 가장 중요한 차이 10: scheduler와 concurrent rendering이 없다

### 현재 프로젝트

현재 런타임은 본질적으로 항상 동기식이다.

- `setState` 즉시 `update()`
- `update()` 즉시 `diff()`
- 즉시 `applyPatches()`
- 즉시 `flushEffects()`

렌더를 중간에 멈추거나, 우선순위를 나누거나, 오래 걸리는 작업을 나중으로 미루는 계층이 없다.

또한 `renderContext`가 전역 단일 객체이기 때문에, 한 번에 하나의 렌더만 가정한다. (`src/runtime/index.js:8-12`)

### 실제 React

React 18 이후 실제 React는 concurrent renderer를 바탕으로 다음을 지원한다.

- automatic batching
- transition 기반 update 우선순위 분리
- rendering pause/resume/abandon 가능성
- commit은 tree 평가가 끝난 뒤 수행

참고:

- [React v18.0](https://react.dev/blog/2022/03/29/react-v18)

이 차이는 단순한 "최적화 여부"를 넘는다. 실제 React가 purity를 강하게 요구하는 이유, StrictMode가 의미 있는 이유, state snapshot 규칙이 중요한 이유가 모두 이 스케줄링 모델과 연결된다.

## 15. 이번 프로젝트가 실제로 잘 가르쳐 주는 것

차이가 많다고 해서 이 구현의 학습 가치가 낮은 것은 아니다. 오히려 아래 개념은 아주 잘 드러난다.

1. 렌더와 커밋의 분리 감각

- 새 UI를 먼저 계산하고
- 이전 결과와 비교한 뒤
- 최소 patch만 반영한다

이 흐름은 React의 큰 감각과 맞닿아 있다.

2. hook이 "함수 내부 변수"가 아니라 외부 저장소에 붙는다는 점

- `hooks[]`와 `hookIndex`는 hook의 본질을 매우 잘 보여준다.

3. deps 비교의 의미

- `useEffect`, `useMemo`가 deps 기반으로 동작한다는 점을 직접 코드로 확인할 수 있다.

4. child view function과 state owner 분리

- 비록 실제 React 구조와는 다르지만, state owner를 정하고 pure view를 아래로 내리는 구조는 UI 설계 훈련에 도움이 된다.

즉, 이 프로젝트는 "React의 모든 것"이 아니라 "React를 이루는 몇 가지 핵심 아이디어의 축소 모형"으로 보는 것이 가장 정확하다.

## 16. 실제 React를 오해하지 않기 위해 꼭 기억할 점

이번 구현만 보고 실제 React를 떠올릴 때 특히 조심해야 할 오해는 아래 6가지다.

1. "훅은 루트에서만 쓴다"

- 아니다. 실제 React는 child component와 custom hook에서도 훅을 쓴다.

2. "컴포넌트는 createElement 시점에 바로 실행된다"

- 아니다. 실제 React는 element를 만들고, reconciler가 나중에 컴포넌트를 호출한다.

3. "`setState`는 값을 즉시 바꾸고 즉시 렌더한다"

- 아니다. 실제 React는 enqueue + batching 모델이다.

4. "`useMemo`는 값을 확실히 저장해 둔다"

- 아니다. 실제 React는 `useMemo`를 semantic storage가 아니라 optimization으로 본다.

5. "리스트 비교는 index 기반으로 해도 된다"

- 실제 React에서 key는 identity 보존의 핵심이다.

6. "이벤트는 DOM 이벤트를 그냥 prop으로 꽂는 것이다"

- 실제 React DOM은 synthetic event와 root delegation을 포함한 더 큰 계층이다.

## 17. 실제 React에 더 가까워지려면 어떤 순서로 확장해야 하나

현재 구조에서 "React에 더 가까운 학습용 런타임"으로 진화시키려면 아래 순서가 좋다.

1. 함수 컴포넌트를 즉시 실행하지 말고 element로 남긴다.

- component node와 host node를 분리해야 한다.

2. 루트 하나가 아닌 tree 단위 인스턴스 구조를 만든다.

- child component마다 state/effect slot을 소유하게 해야 한다.

3. `key`를 reconciliation identity에 반영한다.

- 최소한 list reorder와 insertion에서 key 기반 matching을 넣어야 한다.

4. state update queue와 batching을 넣는다.

- setter 즉시 commit 대신 enqueue -> render pass -> commit pass 구조로 바꿔야 한다.

5. `unmount`와 effect cleanup 전체를 구현한다.

- root unmount
- child subtree 제거
- cleanup on unmount

6. event abstraction을 보강한다.

- synthetic event 전부까지는 아니더라도 root delegation, capture/bubble 처리, form 제어 규칙을 분리할 필요가 있다.

7. `useLayoutEffect`, `useRef`, `useReducer`, context 같은 React 핵심 조합을 추가한다.

이 순서가 중요한 이유는, 뒤 기능 대부분이 앞 구조에 의존하기 때문이다. 특히 child component state와 key reconciliation 없이 "React 비슷한 고급 기능"을 추가하면 표면 API만 늘고 내부 모델은 계속 어긋나게 된다.

## 18. 최종 요약

이번 프로젝트는 실제 React를 축소 복제한 것이 아니라, React의 일부 아이디어를 학습하기 좋게 재배치한 런타임이다.

닮은 점은 분명하다.

- 함수형 컴포넌트 문법
- hook slot 개념
- deps 비교
- render -> diff -> patch -> effect 흐름

하지만 실제 React와 갈라지는 핵심 축도 분명하다.

- component tree를 보존하지 않는다
- 상태가 루트 하나에 몰려 있다
- key 기반 identity가 없다
- setter queue/batching가 없다
- event/effect lifecycle이 훨씬 단순하다
- scheduler/concurrency/root API가 없다

따라서 이 프로젝트를 가장 잘 설명하는 표현은 "React 입문용 핵심 메커니즘 모형"이다. React의 사고방식을 배우기에는 매우 좋다. 하지만 실제 React 자체라고 생각하고 넘어가면, 컴포넌트 state 소유권, reconciliation, effect semantics, batching, concurrent rendering을 오해하게 될 가능성이 크다.

## 19. 검증 메모

작성 시점에 로컬 테스트는 아래 결과로 모두 통과했다.

- `14` test files passed
- `64` tests passed

실행 명령:

```bash
npm test -- --run
```
