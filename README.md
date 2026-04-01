
핵심 개념	이번 주 구현	실제 React
Component / State 구조	루트 컴포넌트가 state를 관리하고, 자식은 props만 받아서 렌더링하도록 단순화했다	실제 React도 컴포넌트 단위로 UI를 나누고 state를 관리하지만, 더 자유로운 구조와 다양한 상태 관리 패턴을 지원한다
Hooks	useState, useEffect, useMemo의 핵심 동작 원리를 직접 구현했다	실제 React는 같은 개념을 더 정교하게 제공하고, 더 많은 Hook과 규칙, 최적화가 포함되어 있다
Virtual DOM / Diff / Patch	상태가 바뀌면 새 Virtual DOM을 만들고, 이전 것과 비교해 바뀐 부분만 실제 DOM에 반영했다	실제 React도 같은 철학을 가지지만, 내부적으로는 훨씬 더 복잡하고 최적화된 방식으로 동작한다
