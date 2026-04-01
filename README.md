# Mini React from Virtual DOM

기존에 구현해 둔 `Virtual DOM + diff + patch` 엔진 위에, 이번 주 과제 요구사항인 `Component`, `State`, `Hooks`를 직접 얹은 프로젝트입니다. 결과물은 단순한 카운터가 아니라, 사용자 입력과 필터링, 상태 토글, `useMemo`, `useEffect`, 디버그 패널까지 한 번에 검증할 수 있는 `수요 코딩회 보드`입니다.

## 구현 범위

- 컴포넌트 단위 런타임 API
  - `createElement`
  - `FunctionComponent`
  - `useState`
  - `useEffect`
  - `useMemo`
- 기존 VDOM 엔진 재사용
  - `vdomToDom`
  - `diff`
  - `applyPatches`
  - `renderTo`
- 테스트 페이지
  - 작업 추가
  - 완료 토글
  - 팀/상태 필터
  - 검색
  - 정렬
  - `localStorage` 저장/복원
  - `document.title` 갱신
  - 런타임 디버그 패널

## 핵심 제약

- Hook은 컴포넌트 render 중에만 사용할 수 있습니다.
- 자식 컴포넌트도 자체 hook slot과 effect lifecycle을 가질 수 있습니다.
- 리스트 자식 상태 보존은 `key`가 있을 때 안정적으로 동작합니다.
- 상태 변경 시 흐름은 `새 vnode 생성 -> diff -> patch -> effect flush` 입니다.
- batching은 넣지 않았고, 성공한 `setState`마다 루트 `update()`를 1회 실행합니다.

## 화면 구성

- 메인 앱: `수요 코딩회 보드`
  - 팀별 작업을 추가하고 완료 여부를 바꿀 수 있습니다.
  - 필터, 검색, 정렬 결과는 `useMemo`로 계산합니다.
  - 남은 작업 수는 `useEffect`로 `document.title`에 반영합니다.
  - 작업 목록은 `useEffect`로 `localStorage`에 저장합니다.
- 디버그 패널
  - render count
  - hook slot 요약
  - patch log
  - effect log

## 파일 구조

```text
src/
  app/
    codingBoardApp.js
    mountCodingBoard.js
  runtime/
    index.js
  lib/
    diff.js
    applyPatches.js
    vdomToDom.js
    renderTo.js
  constants.js
  lib.js
  main.js
tests/
  runtime/
  integration/
  lib/
  cases/
```

## TDD 진행 방식

이번 작업은 기능마다 아래 순서를 고정해서 진행했습니다.

1. `tests/cases/*.csv`에 테스트 케이스를 먼저 기록
2. 기능별 테스트 파일에 실패하는 테스트를 먼저 작성
3. 최소 구현으로 테스트 통과
4. 리팩터링
5. 전체 회귀 테스트 확인

기능별 테스트는 각각 한 파일에서 확인할 수 있게 분리했습니다.

- `tests/runtime/createElement.test.js`
- `tests/runtime/events.test.js`
- `tests/runtime/functionComponent.test.js`
- `tests/runtime/useState.test.js`
- `tests/runtime/useEffect.test.js`
- `tests/runtime/useMemo.test.js`
- `tests/integration/codingBoard.test.js`

CSV 기록 파일도 테스트 파일과 1:1 대응으로 유지합니다.

- `tests/cases/createElement.csv`
- `tests/cases/events.csv`
- `tests/cases/functionComponent.csv`
- `tests/cases/useState.csv`
- `tests/cases/useEffect.csv`
- `tests/cases/useMemo.csv`
- `tests/cases/codingBoard.csv`

CSV 컬럼은 아래 형식으로 통일했습니다.

```text
feature,case_id,scenario,given,when,then,priority,status,test_file
```

## 테스트 포인트

- `createElement` children 정규화와 함수형 자식 컴포넌트 해석
- 이벤트 props 등록/교체/제거
- `FunctionComponent` mount/update와 patch 흐름
- `useState` 상태 유지, functional update, same-value no-op
- `useEffect` deps 비교, cleanup, skip 동작
- `useMemo` 캐시 재사용과 재계산 조건
- 보드 앱의 추가/토글/필터/검색/정렬/저장/복원/디버그 패널
- 기존 VDOM 엔진 회귀 테스트

## 실행 방법

```bash
npm install
npm test -- --run
npm run dev
```

브라우저에서 실행하면 왼쪽에는 보드 앱, 오른쪽에는 런타임 디버그 패널이 표시됩니다.

## 실제 React와의 차이

- Fiber, concurrent rendering, batching, scheduler는 구현하지 않았습니다.
- Hook 규칙 검사도 최소 수준입니다.
- host DOM diff는 여전히 index 기반이지만, child component hook identity는 `key`를 사용해 보존합니다.
- 하지만 상태 유지, deps 비교, cleanup, memo cache, patch 기반 DOM 업데이트라는 핵심 학습 포인트는 직접 확인할 수 있습니다.
