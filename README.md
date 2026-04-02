<img width="512" height="512" alt="image" src="https://github.com/user-attachments/assets/ee9cdd58-8763-4f58-94d2-2958d7e1e588" />

### useState() 실행 흐름
```mermaid
sequenceDiagram
    participant Render as render 중 useState()
    participant Hook as hooks[index]
    participant Setter as hook.setter
    participant Root as root.update()
    participant DOM as diff / applyPatches

    Render->>Hook: slot 확보 또는 재사용
    Render-->>Render: [state, setter] 반환
    Setter->>Hook: hook.value 즉시 갱신
    Setter->>Root: root.update()
    Root->>Root: 루트 전체 rerender
    Root->>DOM: 필요한 patch만 DOM 반영
```

### useEffect() 실행 흐름

```mermaid
sequenceDiagram
    participant Render as render 중 useEffect()
    participant Hook as hooks[index]
    participant Queue as pendingEffects
    participant DOM as renderTo / diff / applyPatches
    participant Flush as flushEffects()

    Render->>Hook: effect slot 확보
    Render->>Queue: dependency array 변경 시 effect 예약
    Render-->>DOM: next VDOM 생성 완료
    DOM->>DOM: 실제 DOM 반영
    DOM->>Flush: commit 완료
    Flush->>Hook: 이전 cleanup 실행
    Flush->>Hook: 새 effect 실행
    Flush->>Hook: cleanup / dependency array 저장
```

## 이번 주 구현 vs 실제 React

| 핵심 개념 | 이번 주 구현 (integration) | 실제 React |
|---|---|---|
| Component / State 구조 | `FunctionComponent`를 기반으로 컴포넌트 트리를 직접 관리했다. 앱 레벨에서는 state를 상위 컴포넌트에 모아두고, 이를 props로 자식 컴포넌트에 전달하는 방식으로 구조를 단순화했다. | 실제 React도 컴포넌트 단위로 UI를 구성하지만, state는 렌더 트리 전반에서 더 유연하게 관리되며 각 컴포넌트가 독립적으로 state를 가질 수 있다. |
| Hooks | 렌더링 시 현재 컴포넌트와 hook 호출 순서를 추적하는 방식으로 `useState`, `useEffect`, `useMemo`를 직접 구현했다. | 실제 React는 동일한 개념을 기반으로 하지만, Fiber 아키텍처 위에서 더 정교한 Hook 관리 방식과 다양한 Hook, 그리고 여러 최적화 기법을 함께 제공한다. |



## useMemo

```mermaid
flowchart TD
    A["컴포넌트 렌더 시작"] --> B["useMemo(factory, deps) 호출"]
    B --> C["getHook('memo')로 현재 hook slot 조회"]
    C --> D{"이전 deps와 현재 deps가 다른가?"}
    D -- "예" --> E["factory() 실행"]
    E --> F["hook.value에 계산 결과 저장"]
    F --> G["hook.deps에 deps 복사 저장"]
    D -- "아니오" --> H["이전 hook.value 재사용"]
    G --> I["memoized value 반환"]
    H --> I
```

이 프로젝트에서 `summary`의 factory는 `() => summarizeTasks(tasks)`이고 deps는 `[tasks]`이다. <br/>
`visibleTasks`의 factory는 `() => filterTasks(tasks, { teamFilter, statusFilter, searchQuery, sortMode })`이고<br/>
deps는 `[tasks, teamFilter, statusFilter, searchQuery, sortMode]`이다.<br/>
즉 관련 값이 바뀌면 다시 계산하고, 바뀌지 않으면 이전에 저장한 `summary`와 `visibleTasks` 결과를 그대로 재사용한다.

1. Component / State 구조 차이
```mermaid
flowchart LR
  subgraph A["이번 주 구현 (integration)"]
    A1["FunctionComponent root"]
    A2["상위 state 관리"]
    A3["자식 컴포넌트"]
    A4["props 전달"]
    A1 --> A2
    A2 --> A4
    A4 --> A3
  end

  subgraph B["실제 React"]
    B1["React component tree"]
    B2["여러 컴포넌트가 각자 state 보유 가능"]
    B3["state는 render tree 기준으로 관리"]
    B1 --> B2
    B1 --> B3
  end

```

그림 2. Hooks 구조 차이
```mermaid
flowchart LR
  subgraph A["이번 주 구현 (integration)"]
    A1["currentComponent"]
    A2["hookIndex"]
    A3["hooks 배열"]
    A1 --> A2
    A2 --> A3
  end

  subgraph B["실제 React"]
    B1["currentlyRenderingFiber"]
    B2["Fiber.memoizedState"]
    B3["Hook linked list"]
    B4["더 정교한 render / commit 관리"]
    B1 --> B2
    B2 --> B3
    B1 --> B4
  end

```

## 테스트는 어떻게 했는지?

테스트는 네 단계로 나눴다.

| 분류 | 목적 |
| --- | --- |
| Unit Test | 각 모듈이 자기 책임을 제대로 수행하는지 확인 |
| Contract Test | 공통 포맷과 계약이 깨지지 않는지 확인 |
| Integration Test | patch, undo, redo까지 전체 흐름이 연결되는지 확인 |
| Concurrency-like / Load Test | 빠른 연속 실행, 큰 입력, 반복 churn에서도 안정적인지 확인 |

<img width="697" height="329" alt="image" src="https://github.com/user-attachments/assets/83e078f0-7ac4-449b-a438-da6ba0bb0fd0" />

## Development Cycles



```mermaid
pie showData
    title 수요 코딩회 작업 비중 (총 640분)
    "요구사항 정리 + 개념 학습 (305분)" : 305
    "공유 + 질문 (100분)" : 100
    "구현 (90분)" : 90
    "베이스 프로젝트 선정 (30분)" : 30
    "README 작성 (75분)" : 75
    "프로젝트 통합 (40분)" : 40


 
