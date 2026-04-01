# Debug Window Fix Plan

## 목표

- 우측 `Runtime Debug` 패널에서 긴 텍스트가 레이아웃을 깨뜨리는 문제를 해결한다.
- `Hook Slots` 정보를 단순 문자열 리스트가 아니라 읽기 쉬운 구조화된 UI로 바꾼다.
- 현재 디버그 패널의 역할은 유지하되, 발표/시연용으로 한눈에 이해되는 형태로 정리한다.

## 현재 문제 요약

### 1. 텍스트 깨짐 / 가독성 저하

- `Hook Slots`에 상태 배열과 메모 값이 `JSON.stringify(...)` 결과 그대로 출력된다.
- 긴 JSON 문자열이 좁은 패널 안에서 과도하게 길어져 시각적으로 깨져 보인다.
- `Patch Log`, `Effect Log`도 모두 같은 문자열 리스트 구조라서 섹션별 정보 밀도가 너무 높다.

### 2. 데이터 표현 방식이 지나치게 원시적임

- 현재 `formatHookSummary`는 hook 객체를 사람이 읽기 좋은 구조로 가공하지 않고 문자열 한 줄로만 만든다.
- `DebugSection`도 `li -> text` 구조만 지원해서, hook 종류별로 다른 표현을 줄 수 없다.
- 결과적으로 `state`, `memo`, `effect`가 모두 동일한 레벨의 텍스트 덩어리처럼 보인다.

## 원인 분석

### 코드 레벨 원인

- `src/app/codingBoardApp.js`
  - `formatHookSummary`가 `state #0: ${JSON.stringify(...)}` 식으로 원시 문자열을 생성한다.
  - `buildDebugPanelVdom`는 이 문자열 배열을 그대로 `DebugSection`에 넘긴다.
  - `DebugSection`은 `items.map((item) => createElement("li", {}, item))` 구조라서 표현력이 없다.

- `src/runtime/index.js`
  - `getDebugSnapshot()`은 hook 값을 구조화된 객체로 반환하고 있지만, UI에서 이를 충분히 활용하지 않고 있다.
  - 즉, 문제는 런타임 데이터 부족보다는 뷰 레이어의 가공 부족에 가깝다.

- `index.html`
  - 디버그 패널 폭과 내부 텍스트 wrapping/overflow 제어가 약하다.
  - 긴 JSON이 들어와도 정보 계층 없이 그대로 표시되므로 읽기 부담이 크다.

## 수정 방향

### 1. Debug Panel 레이아웃 개선

- 우측 패널을 “긴 텍스트 출력창”이 아니라 “상태 인스펙터”처럼 보이도록 재구성한다.
- 패널 헤더, 섹션 헤더, 본문 카드의 시각적 구분을 더 강하게 준다.
- 섹션 내부에 `overflow-wrap: anywhere`, `word-break: break-word` 계열 스타일을 적용해 긴 문자열이 레이아웃을 밀어내지 않게 한다.
- 필요하면 패널 내부의 특정 영역만 스크롤 가능하게 하고, 전체 페이지 레이아웃은 깨지지 않도록 유지한다.

### 2. Hook Slots를 구조화된 카드 UI로 전환

- 문자열 한 줄 리스트 대신 hook 하나당 카드 또는 행(row) 형태로 표현한다.
- 각 항목에 최소한 아래 정보를 분리해서 보여준다.
  - hook 종류: `state`, `memo`, `effect`
  - slot index
  - 요약값 preview
  - 추가 메타데이터

예시 방향:

- `state`
  - `State #0`
  - 현재 값 preview
  - 배열/객체일 경우 item count 또는 key count 요약

- `memo`
  - `Memo #8`
  - 계산 결과 preview
  - deps 존재 시 deps count 또는 간단 요약

- `effect`
  - `Effect #10`
  - deps preview
  - cleanup 여부는 현재 스냅샷 구조상 직접 노출되지 않으므로 우선 deps 중심으로 표기

### 3. 긴 값은 “요약 + 상세” 구조로 표시

- hook value 전체를 한 줄에 다 넣지 않는다.
- 우선 짧은 preview를 노출하고, 긴 배열/객체는 아래 원칙으로 줄인다.
  - 배열: `Array(6)` 같은 요약
  - 객체: 주요 key 일부 + `...`
  - 문자열: 최대 길이 제한 후 생략 부호
- 상세가 꼭 필요하면 `pre` 또는 작은 code block 영역에 분리한다.
- 특히 task 배열처럼 크기가 큰 state는 전체 JSON을 기본 표시하지 않는다.

### 4. 섹션별 렌더링 분리

- `DebugSection` 하나로 모든 섹션을 같은 방식으로 찍지 않고, 역할별 전용 렌더를 둔다.
- 권장 구조:
  - `renderHookSlots(snapshot.hooks)`
  - `renderPatchLog(snapshot.patchLog)`
  - `renderEffectLog(snapshot.effectLog)`
- 이렇게 나누면 `Hook Slots`만 별도 UI 밀도로 꾸밀 수 있다.

### 5. 디버그 데이터 포맷 헬퍼 추가

- UI 레이어에서 아래 헬퍼를 추가해 hook 데이터를 사람이 읽기 좋게 정규화한다.
  - `summarizeDebugValue(value)`
  - `summarizeHook(hook)`
  - `truncateText(text, maxLength)`
- 런타임의 원본 snapshot은 유지하고, 표현용 가공은 `src/app/codingBoardApp.js` 쪽에서 처리한다.

## 변경 대상 파일

### 필수 수정

- `src/app/codingBoardApp.js`
  - `formatHookSummary` 제거 또는 대체
  - `Hook Slots` 전용 렌더 함수 추가
  - debug panel markup 구조 개선

- `index.html`
  - 디버그 패널 관련 CSS 보강
  - 텍스트 wrapping, gap, card 스타일, code block 스타일 조정

### 선택적 보강

- `src/runtime/index.js`
  - 필요 시 `getDebugSnapshot()`에 UI가 쓰기 좋은 부가 메타데이터 추가
  - 단, 가능하면 런타임 구조는 유지하고 앱 레이어에서 해결하는 방향을 우선한다

## 구현 원칙

- 런타임 로직의 의미는 바꾸지 않는다.
- debug snapshot의 원본 정보량은 유지한다.
- UI만 예뻐지는 것이 아니라, 정보 계층이 명확해져야 한다.
- Hook Slots는 문자열 로그가 아니라 “검사 가능한 패널”처럼 보여야 한다.
- 기존 `Patch Log`, `Effect Log`는 보조 정보로 유지하되, 시선 우선순위는 `Hook Slots`보다 낮게 둔다.

## 테스트 계획

### 단위/통합 테스트 관점

- 기존 런타임 테스트는 유지한다.
- 디버그 패널 UI 관련 통합 테스트를 보강한다.

추가할 검증 후보:

- `Hook Slots`가 더 이상 raw JSON 한 줄만 출력하지 않는지
- hook 종류와 index가 분리된 label로 보이는지
- 긴 state가 들어와도 패널 DOM 구조가 카드/블록 단위로 유지되는지
- `Patch Log`, `Effect Log` 텍스트는 여전히 보존되는지

### 수동 확인 포인트

- task를 여러 개 추가했을 때 우측 패널이 옆으로 밀리거나 글자가 뭉개지지 않는지
- 모바일 폭 또는 좁은 창에서도 debug panel이 깨지지 않는지
- `Hook Slots`만 보고도 어떤 상태가 무엇인지 대략 이해되는지

## 완료 기준

- 우측 패널에서 긴 JSON이 그대로 줄줄 흐르지 않는다.
- `Hook Slots`는 hook별 카드/행 구조로 구분되어 보인다.
- `state`, `memo`, `effect`를 시각적으로 즉시 구분할 수 있다.
- 전체 페이지 레이아웃이 현재보다 안정적으로 유지된다.
- 디버그 패널이 발표용 시연에 적합한 수준으로 정리된다.

## 구현하지 않을 것

- 이번 수정에서는 런타임의 hook 동작 방식 자체를 바꾸지 않는다.
- batching, new hook, key diff 같은 기능 확장은 범위 밖이다.
- 디버그 패널을 완전한 DevTools 수준으로 만들지는 않는다.

## 구현 순서 제안

1. 현재 debug panel 데이터를 표현용 구조로 가공하는 헬퍼 설계
2. `Hook Slots` 전용 UI 컴포넌트 작성
3. `Patch Log`, `Effect Log`의 시각 밀도 조정
4. `index.html` CSS 보강
5. 통합 테스트 보강
6. 수동 브라우저 확인

## 대기 상태

- 이 문서는 수정 계획만 정리한 상태다.
- 사용자 OK 전까지 실제 구현은 진행하지 않는다.
