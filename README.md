## 이번 주 구현 vs 실제 React

| 핵심 개념 | 이번 주 구현 (integration) | 실제 React |
|---|---|---|
| Component / State 구조 | `FunctionComponent`를 기반으로 컴포넌트 트리를 직접 관리했다. 앱 레벨에서는 state를 상위 컴포넌트에 모아두고, 이를 props로 자식 컴포넌트에 전달하는 방식으로 구조를 단순화했다. | 실제 React도 컴포넌트 단위로 UI를 구성하지만, state는 렌더 트리 전반에서 더 유연하게 관리되며 각 컴포넌트가 독립적으로 state를 가질 수 있다. |
| Hooks | 렌더링 시 현재 컴포넌트와 hook 호출 순서를 추적하는 방식으로 `useState`, `useEffect`, `useMemo`를 직접 구현했다. | 실제 React는 동일한 개념을 기반으로 하지만, Fiber 아키텍처 위에서 더 정교한 Hook 관리 방식과 다양한 Hook, 그리고 여러 최적화 기법을 함께 제공한다. |

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

##

### 훅 useEffect() 실행 흐름

```mermaid
sequenceDiagram
    participant Render as render 중 useEffect()
    participant Hook as hooks[index]
    participant Queue as pendingEffects
    participant DOM as renderTo / diff / applyPatches
    participant Flush as flushEffects()

    Render->>Hook: effect slot 확보
    Render->>Queue: deps 변경 시 effect 예약
    Render-->>DOM: next VDOM 생성 완료
    DOM->>DOM: 실제 DOM 반영
    DOM->>Flush: commit 완료
    Flush->>Hook: 이전 cleanup 실행
    Flush->>Hook: 새 effect 실행
    Flush->>Hook: cleanup / deps 저장
```

### useState() 실행 흐름
<img width="1091" height="617" alt="스크린샷 189" src="https://github.com/user-attachments/assets/8ead585f-4740-4c8c-9900-1b3031137e54" />

