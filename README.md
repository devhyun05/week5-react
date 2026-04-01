## 이번 주 구현 vs 실제 React

| 핵심 개념 | 이번 주 구현 | 실제 React |
|---|---|---|
| Component / State 구조 | 루트 컴포넌트가 state를 관리하고, 자식 컴포넌트는 props만 받아 렌더링하도록 단순화했다. | 실제 React도 컴포넌트 단위로 UI를 분리하고 state를 관리하지만, 더 유연한 구조와 다양한 상태 관리 패턴을 지원한다. |
| Hooks | `useState`, `useEffect`, `useMemo`의 핵심 동작 원리를 직접 구현했다. | 실제 React는 동일한 개념을 더 정교하게 제공하며, 더 많은 Hook, 규칙, 그리고 최적화가 포함되어 있다. |
| Virtual DOM / Diff / Patch | 상태가 변경되면 새로운 Virtual DOM을 만들고, 이전 Virtual DOM과 비교해 변경된 부분만 실제 DOM에 반영했다. | 실제 React도 같은 철학을 기반으로 하지만, 내부적으로는 훨씬 더 복잡하고 최적화된 방식으로 동작한다. |
