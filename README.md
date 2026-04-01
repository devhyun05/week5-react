# Week 5 Mini React 프로젝트 명세서

## 프로젝트 개요

- 이번 주 목표는 지난 주에 구현한 `Virtual DOM + Diff + Patch` 엔진을 재사용해, `Component`, `State`, `Hooks`를 직접 구현하는 것입니다.
- 외부 프레임워크 없이 바닐라 JavaScript만으로 동작하는 작은 React 런타임을 만들고, 그 위에서 실제로 상호작용 가능한 웹 페이지를 구현합니다.
- 결과물은 단순 데모가 아니라, 발표와 포트폴리오에 바로 사용할 수 있도록 `설계 근거`, `테스트`, `시연 흐름`까지 포함한 형태로 완성합니다.

## 이번 주 핵심 목표

- 함수형 컴포넌트 기반의 UI 시스템 구현
- 루트 컴포넌트 한 곳에서만 상태를 관리하는 구조 확립
- `useState`, `useEffect`, `useMemo` 직접 구현
- 상태 변경 시 전체 리렌더가 아니라 `Diff + Patch`를 통한 최소 DOM 업데이트 수행
- 단위 테스트와 기능 테스트로 핵심 모듈 검증

## 과제 해석과 팀 규칙

### 1. 컴포넌트 규칙

- 모든 컴포넌트는 함수형 컴포넌트로 구현합니다.
- 루트 컴포넌트는 `App` 하나로 고정합니다.
- 자식 컴포넌트는 모두 `props`만 받아 사용하는 순수 함수입니다.
- 자식 컴포넌트는 상태를 가지지 않습니다.
- 자식 컴포넌트에서는 Hook을 사용할 수 없습니다.

### 2. 상태 규칙

- 상태는 루트 컴포넌트 `App`에서만 관리합니다.
- 모든 사용자 상호작용은 루트 state를 갱신하는 방식으로만 처리합니다.
- 자식 컴포넌트는 상태를 직접 수정하지 않고, 부모가 내려준 이벤트 핸들러를 호출합니다.

### 3. Hook 규칙

- 구현 대상은 `useState`, `useEffect`, `useMemo`입니다.
- Hook은 오직 루트 컴포넌트 렌더링 중에만 호출할 수 있습니다.
- Hook 순서는 매 렌더마다 동일해야 하며, `hooks 배열 + hookIndex` 방식으로 상태를 유지합니다.

### 4. 렌더링 규칙

- 화면은 항상 `state -> vnode -> diff -> patch -> real DOM` 흐름으로 갱신됩니다.
- 함수형 컴포넌트는 먼저 실행해서 일반 vnode로 펼친 뒤 기존 diff 엔진에 전달합니다.
- 실제 DOM 변경은 `applyPatches()`를 통해 필요한 부분만 반영합니다.

## 데모 주제

### Todo Board with Undo/Redo

- 이번 주 데모 주제는 `Todo Board`로 고정합니다.
- 입력, 추가, 완료 토글, 삭제, 필터링, 통계, undo/redo까지 모두 포함해 과제 요구사항을 충분히 보여줄 수 있습니다.
- `useMemo`는 필터링된 목록과 통계 계산에 사용합니다.
- `useEffect`는 `localStorage` 저장, `document.title` 갱신에 사용합니다.
- 지난 주 `history` 모듈을 재활용해 state snapshot 기반 undo/redo까지 확장합니다.

## 화면 요구사항

- 할 일 입력창이 있어야 합니다.
- `추가` 버튼 또는 Enter 입력으로 todo를 등록할 수 있어야 합니다.
- 각 todo는 완료 토글과 삭제가 가능해야 합니다.
- `All`, `Active`, `Completed` 필터를 제공해야 합니다.
- 완료 개수와 남은 개수를 표시해야 합니다.
- `Undo`, `Redo` 버튼으로 이전 상태와 다음 상태로 이동할 수 있어야 합니다.
- 새로고침 후에도 상태가 유지되도록 `localStorage`를 사용합니다.

## 상태 모델

루트 컴포넌트 `App`는 아래 상태를 관리합니다.

```js
{
  todos: [
    {
      id: number,
      text: string,
      completed: boolean,
      createdAt: number
    }
  ],
  draft: string,
  filter: "all" | "active" | "completed"
}
```

추가로 runtime 내부에서는 다음 정보를 관리합니다.

- 이전 vnode
- 현재 루트 DOM
- hooks 배열
- hookIndex
- pending effects
- history snapshot stack

## 렌더링 흐름

1. `mount()`가 호출되면 루트 컴포넌트 `App`을 실행합니다.
2. `App`은 state를 바탕으로 새로운 vnode 트리를 반환합니다.
3. 첫 렌더는 `renderTo()`로 실제 DOM에 그립니다.
4. 이후 `setState()`가 호출되면 루트 업데이트를 예약합니다.
5. `update()`에서 `App`을 다시 실행해 다음 vnode를 만듭니다.
6. 이전 vnode와 다음 vnode를 `diff()`로 비교합니다.
7. 생성된 patch를 `applyPatches()`로 실제 DOM에 반영합니다.
8. DOM 반영이 끝난 뒤 `useEffect()`를 실행합니다.

## 아키텍처 설계

### 재사용할 기존 모듈

- `src/lib/domToVdom.js`
- `src/lib/vdomToDom.js`
- `src/lib/diff.js`
- `src/lib/applyPatches.js`
- `src/lib/renderTo.js`
- `src/history.js`

### 새로 추가할 모듈

- `src/runtime/FunctionComponent.js`
- `src/runtime/hooks.js`
- `src/runtime/h.js`
- `src/runtime/index.js`
- `src/app/App.js`
- `src/app/components/TodoInput.js`
- `src/app/components/TodoList.js`
- `src/app/components/TodoItem.js`
- `src/app/components/FilterTabs.js`
- `src/app/components/StatsPanel.js`
- `src/app/components/HistoryControls.js`
- `src/main.js`

## 구현 규칙

### FunctionComponent

- `FunctionComponent` 클래스는 루트 함수형 컴포넌트를 감쌉니다.
- 필수 필드는 `hooks`, `hookIndex`, `prevVdom`, `rootDom`, `container`, `pendingEffects`입니다.
- `mount()`는 첫 렌더를 수행합니다.
- `update()`는 state 변경 후 재렌더를 수행합니다.

### useState

- hook slot 단위로 상태를 저장합니다.
- `setState(nextValue)` 호출 시 값을 갱신하고 루트 `update()`를 예약합니다.
- 함수형 업데이트 `setState(prev => next)`도 지원합니다.

### useEffect

- 렌더 중 effect를 등록합니다.
- DOM 반영 후 effect를 실행합니다.
- deps가 변하지 않으면 effect를 다시 실행하지 않습니다.
- cleanup 함수가 반환되면 다음 effect 실행 전 또는 unmount 시 정리합니다.

### useMemo

- 이전 deps와 현재 deps를 비교합니다.
- deps가 같으면 이전 계산 결과를 재사용합니다.
- deps가 바뀌면 factory를 다시 실행합니다.

### 이벤트 처리

- `onClick`, `onInput`, `onChange`, `onSubmit`를 우선 지원합니다.
- 이벤트 핸들러는 DOM prop이 아니라 listener로 안전하게 관리합니다.
- patch 시 이전 리스너 제거와 새 리스너 등록이 올바르게 동작해야 합니다.

## 폴더별 역할

### `src/lib`

- 지난 주에 만든 vDOM 엔진과 patch 로직을 유지합니다.
- 필요한 경우 이벤트 prop 지원을 위해 `domProps.js`를 확장합니다.

### `src/runtime`

- Mini React runtime의 핵심 구현 영역입니다.
- 컴포넌트 실행, Hook 보관, 렌더 사이클, effect 처리 책임을 가집니다.

### `src/app`

- 실제 데모 UI를 구성하는 영역입니다.
- 모든 자식 컴포넌트는 stateless pure function으로 작성합니다.

### `tests`

- 런타임 단위 테스트와 데모 기능 테스트를 분리합니다.

## To-do List

### 1. Runtime 골격

- [ ] `src/runtime` 디렉터리를 생성합니다.
- [ ] `FunctionComponent` 클래스를 구현합니다.
- [ ] 루트 컴포넌트 mount/update 흐름을 구성합니다.
- [ ] 현재 렌더 중인 인스턴스를 추적하는 전역 컨텍스트를 만듭니다.

### 2. vnode 생성기

- [ ] `h(type, props, ...children)` 함수를 구현합니다.
- [ ] 문자열 태그는 `elementNode()`로 변환합니다.
- [ ] 문자열/숫자 child는 `textNode()`로 변환합니다.
- [ ] `null`, `undefined`, `false` child는 무시합니다.
- [ ] 중첩 배열 children을 평탄화합니다.
- [ ] 함수형 컴포넌트는 즉시 실행해 vnode로 펼칩니다.

### 3. Hook 시스템

- [ ] `useState()`를 구현합니다.
- [ ] `useEffect()`를 구현합니다.
- [ ] `useMemo()`를 구현합니다.
- [ ] Hook 호출이 루트 컴포넌트 밖에서 발생하면 예외를 던지게 만듭니다.
- [ ] Hook 순서가 어긋나는 상황을 디버깅할 수 있도록 에러 메시지를 정리합니다.

### 4. DOM 반영 확장

- [ ] `src/lib/domProps.js`에 이벤트 리스너 처리를 추가합니다.
- [ ] prop 변경 시 기존 리스너가 중복 등록되지 않도록 보장합니다.
- [ ] style, boolean prop, dataset, aria 속성도 기존 동작을 유지합니다.

### 5. Todo Board 앱 구현

- [ ] `App` 루트 컴포넌트를 구현합니다.
- [ ] `TodoInput` 컴포넌트를 구현합니다.
- [ ] `TodoList` 컴포넌트를 구현합니다.
- [ ] `TodoItem` 컴포넌트를 구현합니다.
- [ ] `FilterTabs` 컴포넌트를 구현합니다.
- [ ] `StatsPanel` 컴포넌트를 구현합니다.
- [ ] `HistoryControls` 컴포넌트를 구현합니다.
- [ ] 빈 입력 방지, 중복 공백 처리, 빈 목록 상태 UI를 구현합니다.

### 6. 상태/파생값/부수효과

- [ ] `todos`, `draft`, `filter`를 루트 state로 관리합니다.
- [ ] 필터링된 todo 목록 계산에 `useMemo()`를 사용합니다.
- [ ] 완료 개수, 남은 개수 계산에 `useMemo()`를 사용합니다.
- [ ] 상태 변경 시 `localStorage` 저장을 `useEffect()`로 처리합니다.
- [ ] 상태 요약을 `document.title`에 반영합니다.

### 7. 히스토리 기능

- [ ] 기존 `createHistory()`를 state snapshot 기반으로 연결합니다.
- [ ] todo 추가, 삭제, 토글, 필터 변경 시 snapshot을 push합니다.
- [ ] undo/redo 이동 시 실제 state와 화면이 함께 복원되게 만듭니다.
- [ ] undo 후 새 상태가 생기면 redo 스택을 제거합니다.

### 8. 테스트

- [ ] `FunctionComponent` mount/update 테스트를 작성합니다.
- [ ] `useState` 초기화/업데이트/함수형 업데이트 테스트를 작성합니다.
- [ ] `useEffect` deps/cleanup 테스트를 작성합니다.
- [ ] `useMemo` 캐시 재사용 테스트를 작성합니다.
- [ ] 이벤트 prop patch 테스트를 작성합니다.
- [ ] 루트 state 변경 시 patch 기반 DOM 업데이트 테스트를 작성합니다.
- [ ] Todo 기능 테스트를 작성합니다.
- [ ] undo/redo 기능 테스트를 작성합니다.
- [ ] localStorage 복원 테스트를 작성합니다.

### 9. 발표 준비

- [ ] README에 최종 아키텍처와 구현 결과를 정리합니다.
- [ ] 실제 React와 이번 구현의 차이점을 정리합니다.
- [ ] 데모 시나리오를 4분 발표 기준으로 정리합니다.
- [ ] 테스트 결과를 표 또는 체크리스트로 정리합니다.

## 테스트 전략

### 단위 테스트

- `diff`, `applyPatches`, `renderTo` 기존 테스트는 유지합니다.
- `FunctionComponent`, `useState`, `useEffect`, `useMemo`를 별도 테스트 파일로 검증합니다.
- 이벤트 리스너 등록/교체/제거를 검증합니다.

### 기능 테스트

- 사용자가 todo를 입력하고 추가할 수 있는지 검증합니다.
- 완료 토글과 삭제가 정상 동작하는지 검증합니다.
- 필터 변경 시 목록과 통계가 함께 갱신되는지 검증합니다.
- 새로고침 복원과 undo/redo 흐름이 올바른지 검증합니다.

### 엣지 케이스

- 빈 문자열 입력
- 공백만 있는 입력
- 매우 긴 문자열 입력
- 빠른 연속 클릭
- 동일 state 재설정
- effect deps 변경 없음
- undo 후 새 액션 발생

## 차별화 포인트

- 지난 주 vDOM 엔진을 단순 재사용하는 수준을 넘어서, 그 위에 작은 React runtime을 직접 올립니다.
- `Undo/Redo + LocalStorage + useMemo + useEffect`를 한 화면에서 모두 보여줍니다.
- 발표 때 “함수는 다시 실행되는데 state는 왜 유지되는가?”를 `hooks 배열 + index` 구조로 직접 설명할 수 있습니다.
- 실제 React와 비교해 무엇이 빠져 있는지까지 설명 가능한 결과물을 목표로 합니다.

## 실제 React와의 차이점

- Fiber 구조가 없습니다.
- 비동기 스케줄링과 우선순위 조정이 없습니다.
- Hook은 루트 컴포넌트만 지원합니다.
- Context, Ref, Suspense, Concurrent Rendering은 구현하지 않습니다.
- diff도 keyed reconciliation이 아니라 단순 index 기반 비교에 가깝습니다.

## 완료 기준

- `FunctionComponent`, `useState`, `useEffect`, `useMemo`가 동작합니다.
- 루트 state 변경만으로 화면이 자동 갱신됩니다.
- 실제 DOM 갱신은 `diff + patch` 경로를 사용합니다.
- 자식 컴포넌트는 props-only 구조를 지킵니다.
- 테스트가 통과합니다.
- README만 읽어도 아키텍처와 데모 흐름을 설명할 수 있습니다.

## 발표 시연 순서

1. 앱 로드 시 초기 todo 목록이 렌더링되는 모습을 보여줍니다.
2. 새 todo 입력 후 추가하면서 `useState` 동작을 설명합니다.
3. 필터를 변경하면서 `useMemo`의 역할을 설명합니다.
4. 새로고침 후 상태 복원으로 `useEffect + localStorage`를 설명합니다.
5. undo/redo를 시연하며 state history와 patch 기반 업데이트를 설명합니다.
6. 마지막으로 실제 React와의 차이점을 짧게 정리합니다.
