# Function Component / Hook System Research

## 1. 문서 목적

이 문서는 현재 프로젝트에 구현된 `FunctionComponent`, `useState`, `useEffect`, `useMemo` 시스템이 실제로 어떻게 작동하는지, 그리고 그것이 기존 `Virtual DOM + diff + patch` 엔진과 어떻게 결합되는지를 코드 기준으로 매우 상세히 설명한다.

이 문서의 목표는 아래 3가지다.

1. 현재 구현이 어떤 철학과 제약 위에서 설계되었는지 이해한다.
2. 각 함수와 데이터 구조가 어떤 책임을 갖는지 코드 레벨에서 추적한다.
3. 실제 앱인 `수요 코딩회 보드`에서 훅이 어떻게 사용되는지 end-to-end로 연결해서 본다.

---

## 2. 전체 구조 한눈에 보기

현재 구현은 실제 React 전체를 복제한 것이 아니다. 대신 아래 구조를 가진 “작고 제한된 Mini React”다.

- VNode 생성: `src/runtime/index.js`의 `createElement`
- 루트 컴포넌트 인스턴스: `src/runtime/index.js`의 `FunctionComponent`
- 훅 저장소: `FunctionComponent.hooks`
- 훅 호출 추적: `renderContext`
- 화면 업데이트: `diff` + `applyPatches`
- 최초 렌더: `renderTo`
- 데모 앱: `src/app/mountCodingBoard.js`, `src/app/codingBoardApp.js`

핵심 제약은 아주 분명하다.

- 상태는 루트 컴포넌트에만 있다.
- 훅은 루트 컴포넌트에서만 호출 가능하다.
- 자식 함수형 컴포넌트는 모두 stateless pure function이다.
- 렌더 트리는 하나의 루트 `FunctionComponent`가 책임진다.

즉, 이 시스템은 “함수형 컴포넌트마다 인스턴스가 하나씩 있다”는 React 방식이 아니라, “루트 하나가 모든 hook slot을 갖고 자식 함수는 그냥 순수 함수처럼 즉시 실행된다”는 모델이다.

---

## 3. 관련 파일과 역할

| 파일 | 역할 |
| --- | --- |
| `src/constants.js` | VNode와 Patch 타입 정의 |
| `src/runtime/index.js` | `createElement`, `FunctionComponent`, `useState`, `useEffect`, `useMemo` 구현 |
| `src/lib/diff.js` | 이전 VNode와 새 VNode 비교 |
| `src/lib/applyPatches.js` | diff 결과를 실제 DOM에 반영 |
| `src/lib/domProps.js` | DOM prop 반영과 이벤트 prop 등록/제거 |
| `src/lib/vdomToDom.js` | VNode를 실제 DOM으로 변환 |
| `src/lib/renderTo.js` | 최초 렌더 시 container 전체 교체 |
| `src/app/mountCodingBoard.js` | 루트 앱 컴포넌트와 상태/훅 wiring |
| `src/app/codingBoardApp.js` | stateless UI 컴포넌트들과 파생 로직 |
| `tests/runtime/*.test.js` | 런타임 레벨 보장 검증 |
| `tests/integration/codingBoard.test.js` | 앱 전체 흐름 검증 |

---

## 4. 데이터 모델

### 4.1 VNode

VNode 타입은 `src/constants.js:1-26`에서 정의된다.

텍스트 노드:

```js
{ nodeType: "TEXT_NODE", value }
```

엘리먼트 노드:

```js
{ nodeType: "ELEMENT_NODE", type, props, children }
```

이 구조는 매우 단순하다.

- `type`은 태그 이름 문자열
- `props`는 일반 DOM 속성 객체
- `children`은 다시 VNode 배열

중요한 점:

- 컴포넌트는 VNode 타입으로 남지 않는다.
- 함수형 컴포넌트는 `createElement` 호출 시 즉시 실행되어 결국 plain VNode를 반환한다.

즉, 런타임 내부에 “컴포넌트 노드”라는 별도 타입은 없다.

### 4.2 Patch

Patch 타입은 `src/constants.js:20-25`에 있다.

- `TEXT`
- `REPLACE`
- `PROPS`
- `ADD`
- `REMOVE`

각 patch는 `path`를 가진다. `path`는 루트 기준 자식 인덱스 배열이다.

예시:

- `[]` → 루트 자체
- `[0]` → 루트의 첫 번째 자식
- `[1, 0]` → 두 번째 자식의 첫 번째 자식

### 4.3 FunctionComponent 인스턴스 상태

`src/runtime/index.js:146-160`에서 생성되는 루트 인스턴스는 아래 내부 필드를 가진다.

- `Component`: 루트 함수형 컴포넌트
- `props`: 루트 props
- `hooks`: hook slot 배열
- `pendingEffects`: 이번 렌더 후 실행할 effect 큐
- `container`: mount 대상 DOM
- `rootDom`: 현재 루트 실제 DOM 노드
- `currentVdom`: 직전 렌더 VNode
- `renderCount`: 총 렌더 횟수
- `lastPatches`: 마지막 update에서 나온 patch 배열
- `patchLog`: 누적 patch 요약 문자열
- `effectLog`: 누적 effect 실행/cleanup 요약 문자열

이 중 가장 중요한 것은 `hooks`와 `currentVdom`이다.

---

## 5. 이 시스템이 상태를 유지할 수 있는 이유

훅의 핵심 질문은 이것이다.

> 함수는 매번 다시 실행되는데 상태는 어디에 저장되는가?

현재 구현의 답은 명확하다.

- 상태는 함수 안에 있지 않다.
- 상태는 `FunctionComponent` 인스턴스의 `hooks` 배열에 저장된다.
- 함수는 렌더 때마다 다시 실행되지만, `hooks` 배열은 인스턴스에 남아 있기 때문에 유지된다.

즉:

1. `App()` 함수는 매 렌더마다 다시 호출된다.
2. `useState()`는 로컬 변수에 저장하지 않고 `instance.hooks[index]`를 읽는다.
3. 다음 렌더에서도 같은 호출 순서라면 같은 `index`를 다시 읽는다.
4. 그래서 “함수는 새로 실행되지만 상태는 유지”된다.

이것이 훅의 핵심이고, 현재 구현도 완전히 같은 아이디어를 따른다.

---

## 6. renderContext: 훅 호출을 추적하는 전역 컨텍스트

`src/runtime/index.js:8-12`

```js
const renderContext = {
  currentInstance: null,
  hookIndex: 0,
  componentDepth: 0,
};
```

이 객체는 현재 렌더 중인 상태를 나타내는 매우 작은 전역 상태다.

### 6.1 currentInstance

현재 렌더 중인 루트 `FunctionComponent` 인스턴스를 가리킨다.

용도:

- `useState`, `useEffect`, `useMemo`가 어떤 `hooks` 배열에 접근해야 하는지 알기 위해 사용

### 6.2 hookIndex

현재 렌더 중 몇 번째 훅 호출인지를 추적한다.

예를 들어 루트 컴포넌트가 아래와 같다면:

```js
const [tasks] = useState(...)
const [title] = useState(...)
const summary = useMemo(...)
useEffect(...)
```

slot은 다음처럼 고정된다.

- 0: `tasks`
- 1: `title`
- 2: `summary` memo
- 3: effect

다음 렌더에서도 같은 순서로 호출되면 같은 slot을 재사용한다.

### 6.3 componentDepth

현재 실행 중인 함수형 컴포넌트가 루트인지 자식인지 구분한다.

- 루트 컴포넌트 본문에서는 `0`
- 자식 함수형 컴포넌트를 실행할 때는 `withChildDepth`로 `+1`

이 값 덕분에 훅을 루트 전용으로 강제할 수 있다.

---

## 7. createElement의 실제 동작

구현 위치: `src/runtime/index.js:128-144`

`createElement`는 React의 JSX 결과를 대신하는 함수다.

### 7.1 children 정규화

먼저 `normalizeChildren(children)`이 실행된다 (`src/runtime/index.js:45-48`).

하위 동작은 `normalizeChild`에 있다 (`src/runtime/index.js:22-43`).

규칙:

- 배열이면 재귀적으로 펼친다.
- `null`, `undefined`, `boolean`은 무시한다.
- `string`, `number`는 `textNode(String(value))`로 변환한다.
- 이미 VNode면 그대로 사용한다.
- 나머지는 `TypeError("Invalid child.")`

즉, 이 구현은 JSX에서 흔히 기대하는 아래 행동을 직접 코드로 재현한다.

- children flatten
- falsy child skip
- primitive to text vnode

### 7.2 문자열 태그 처리

```js
createElement("div", props, ...children)
```

이면 마지막에 `elementNode(type, props, normalizedChildren)`을 반환한다 (`src/runtime/index.js:143`).

즉, 여기서는 단순 VNode 팩토리다.

### 7.3 함수형 컴포넌트 처리

```js
createElement(ChildComponent, props, ...children)
```

이면 `type`이 함수이므로 즉시 실행한다 (`src/runtime/index.js:132-140`).

이때 중요한 점:

- `children`은 `props.children`으로 넣는다.
- 함수 실행 결과는 `normalizeComponentOutput`으로 감싼다.
- 반환값은 문자열/숫자면 text vnode로 바꾸고, VNode가 아니면 에러다.

즉, 자식 함수형 컴포넌트는 “VNode 생성 헬퍼” 역할을 한다.

### 7.4 child component에서 hooks를 막는 방식

함수형 자식 컴포넌트를 실행할 때 `withChildDepth`를 사용한다 (`src/runtime/index.js:63-71`, `132-140`).

과정:

1. `componentDepth += 1`
2. 자식 컴포넌트 실행
3. 끝나면 `componentDepth -= 1`

그래서 자식 함수 내부에서 `useState()`를 호출하면 `assertRootHookAccess()`가 실패한다.

테스트도 이 동작을 검증한다.

- `tests/runtime/useState.test.js:52-68`
- `tests/runtime/useEffect.test.js:42-58`
- `tests/runtime/useMemo.test.js:48-64`

---

## 8. Hook 접근 제어

`assertRootHookAccess`는 `src/runtime/index.js:85-92`에 있다.

실패 조건:

- `currentInstance`가 없다
- `componentDepth !== 0`

즉, 아래 둘 다 금지된다.

1. 렌더 바깥에서 훅 호출
2. child component 내부에서 훅 호출

이 프로젝트의 요구사항인 “Hook은 최상위 컴포넌트에서만 사용 가능”을 정확히 코드로 강제한 부분이다.

---

## 9. getHook: hook slot을 읽고 만드는 공통 엔진

핵심 함수는 `src/runtime/index.js:94-114`의 `getHook`이다.

동작 순서:

1. 루트 훅 접근인지 검사
2. 현재 인스턴스 읽기
3. 현재 `hookIndex` 읽기
4. `instance.hooks[hookIndex]` 확인
5. `hookIndex += 1`
6. 기존 hook이 없으면 생성해서 저장
7. 기존 hook이 있으면 kind가 같은지 검사
8. hook 반환

이 함수는 사실상 “훅 배열에서 현재 슬롯을 빌려오는 API”다.

### 9.1 왜 hook 순서가 중요해지는가

훅은 이름으로 저장되지 않는다.

이 구현은 오직 “몇 번째 호출인가”로 훅을 식별한다.

예를 들어 첫 렌더:

```js
useState()   // slot 0
useMemo()    // slot 1
useEffect()  // slot 2
```

다음 렌더에서 순서가 바뀌면:

```js
useMemo()    // slot 0 읽으려 함
```

slot 0에는 원래 state hook이 있으므로 `existingHook.kind !== kind`가 되어 에러가 난다 (`src/runtime/index.js:109-110`).

즉, React의 “hook은 같은 순서로 호출되어야 한다”는 규칙을 매우 직선적으로 구현했다.

---

## 10. FunctionComponent 클래스 상세 분석

## 10.1 constructor

`src/runtime/index.js:146-160`

이 클래스는 루트 함수형 컴포넌트를 감싸는 인스턴스다.

핵심 저장물:

- `hooks`: 훅 슬롯 저장소
- `currentVdom`: 직전 렌더 결과
- `rootDom`: 실제 DOM 루트

즉, 이 클래스는 아래 두 세계를 연결한다.

- 함수형 UI 계산 결과인 VNode 세계
- 실제 DOM 세계

## 10.2 mount

`src/runtime/index.js:162-177`

동작 순서:

1. container 저장
2. `renderComponent()` 실행해서 첫 VNode 생성
3. `renderTo(container, nextVdom)`로 최초 전체 렌더
4. `currentVdom`, `rootDom` 저장
5. `renderCount += 1`
6. `flushEffects()`
7. `notifyCommit()`

중요:

- mount는 patch를 쓰지 않는다.
- 처음에는 old tree가 없으므로 전체 렌더가 더 단순하다.

## 10.3 update

`src/runtime/index.js:179-206`

동작 순서:

1. props 갱신
2. `renderComponent()`로 새 VNode 생성
3. old VNode와 new VNode를 `diff`
4. patch가 있으면 `applyPatches`
5. `currentVdom`, `lastPatches`, `rootDom` 갱신
6. `renderCount += 1`
7. `flushEffects()`
8. `notifyCommit()`

핵심은 이 줄이다.

```js
patches = diff(this.currentVdom, nextVdom);
```

즉, 상태 변경 자체는 DOM을 직접 건드리지 않는다.
상태 변경은 새 VNode를 만들고, 이전 VNode와 비교해서 필요한 최소 DOM 변경만 계산한 뒤 반영한다.

이것이 React 철학에서 가장 중요한 부분 중 하나다.

### 10.3.1 patch가 없을 때

`patches.length === 0`이면 `applyPatches`를 생략한다.

그래도:

- `currentVdom`는 새 값으로 갱신
- `renderCount`는 증가
- `flushEffects()`는 실행됨

즉, “렌더는 있었지만 DOM 변경은 없었다”는 상황을 표현한다.

## 10.4 renderComponent

`src/runtime/index.js:208-221`

이 함수는 훅 렌더링 준비와 정리를 맡는다.

렌더 시작 시:

- `pendingEffects = []`
- `currentInstance = this`
- `hookIndex = 0`
- `componentDepth = 0`

렌더 종료 시 `finally`에서 다시 모두 초기화한다.

이 초기화가 중요한 이유:

- 다음 렌더에서 hook index가 다시 0부터 시작해야 같은 슬롯에 매핑된다.

즉, hook slot 유지의 핵심은:

1. 인스턴스의 `hooks` 배열은 유지
2. 렌더 시작 시 `hookIndex`만 0으로 리셋

## 10.5 flushEffects

`src/runtime/index.js:223-243`

이 함수는 렌더 중 예약된 effect들을 커밋 이후 실행한다.

순서:

1. `pendingEffects` 순회
2. 이전 cleanup 있으면 먼저 실행
3. 새 effect 실행
4. 반환값이 함수면 cleanup으로 저장
5. deps 스냅샷 저장
6. 디버그 로그 남김

즉, 현재 구현의 effect 생명주기는 “렌더 중 등록 -> 렌더 후 실행 -> 다음 재실행 전 cleanup”이다.

주의할 점:

- unmount 시 cleanup을 자동 실행하는 별도 API는 없다.
- 따라서 현재는 “재실행 전 cleanup”은 지원하지만 “인스턴스 폐기 시 cleanup”은 별도로 없다.

## 10.6 getDebugSnapshot

`src/runtime/index.js:263-282`

디버그 패널에 필요한 요약 데이터를 만든다.

포함 내용:

- render count
- last patches
- patch log
- effect log
- hook slots 요약

이 함수 덕분에 런타임 내부 상태를 외부 UI로 관찰할 수 있다.

---

## 11. useState 상세 분석

구현 위치: `src/runtime/index.js:285-317`

### 11.1 초기화

`getHook("state", ...)`를 호출해 slot을 가져온다.

초기 hook shape:

```js
{
  kind: "state",
  value,
  setter: null,
  owner: instance,
}
```

특징:

- lazy initializer 지원:
  - `typeof initialValue === "function"`이면 한 번 실행해서 초기값 생성

### 11.2 setter는 한 번만 생성된다

`if (!hook.setter)` 블록 안에서 setter를 생성한다.

즉:

- 첫 렌더에만 setter 함수를 만든다.
- 다음 렌더부터는 기존 setter를 재사용한다.

이 점이 중요하다.

- setter identity가 유지된다.
- setter 내부는 `hook` 객체를 닫아잡고 있으므로 최신 `hook.value`를 볼 수 있다.

### 11.3 setter 동작

setter 내부 순서:

1. `nextValue`가 함수면 updater로 실행
2. 아니면 그대로 값 사용
3. `Object.is`로 이전 값과 같으면 종료
4. `hook.value = resolvedValue`
5. `hook.owner.update()` 호출

즉, state 변경은 즉시 동기적으로 루트 전체 재렌더를 트리거한다.

현재 구현에는:

- batching 없음
- scheduler 없음
- transition 없음

### 11.4 functional update가 되는 이유

```js
setCount((value) => value + 1)
```

이 패턴을 `tests/runtime/useState.test.js:11-30`이 검증한다.

setter가 updater 함수를 받으면 현재 `hook.value`를 인자로 넘겨 계산하므로 연속 호출도 안전하다.

### 11.5 same-value no-op

`Object.is(hook.value, resolvedValue)`이면 바로 반환한다 (`src/runtime/index.js:299-301`).

따라서:

- 값이 바뀌지 않으면 렌더 수 증가 없음
- patch 계산도 없음

이 동작은 `tests/runtime/useState.test.js:32-50`에서 검증한다.

### 11.6 한계

- 비동기 업데이트 큐가 없다.
- 여러 `setState`를 모아서 한 번에 처리하지 않는다.
- stale closure를 해결하는 고급 메커니즘은 없다.
- 루트 전체를 매번 다시 렌더한다.

하지만 학습 목적에서는 훅 상태 유지의 본질을 드러내는 아주 좋은 단순화다.

---

## 12. useEffect 상세 분석

구현 위치: `src/runtime/index.js:319-333`

### 12.1 effect는 즉시 실행되지 않는다

`useEffect`는 effect 함수를 바로 실행하지 않는다.

대신 deps가 바뀌었을 때 `pendingEffects`에 push한다.

```js
renderContext.currentInstance.pendingEffects.push({
  index: hookIndex,
  effect,
  deps,
});
```

즉, 렌더 단계에서는 “예약”만 하고, 실제 실행은 `flushEffects()`에서 한다.

이 구조가 중요한 이유:

- DOM patch가 끝난 뒤 effect가 실행된다.
- 따라서 effect는 업데이트된 화면을 기준으로 동작할 수 있다.

### 12.2 depsChanged

`src/runtime/index.js:73-83`

규칙:

- 이전 deps가 없으면 변경으로 본다
- 새 deps가 없으면 항상 변경으로 본다
- 길이가 다르면 변경
- 각 요소를 `Object.is`로 비교

즉:

- `deps`를 생략하면 매 렌더마다 실행
- `[]`를 주면 mount 후 한 번만 실행
- `[count]`면 count가 바뀔 때만 실행

### 12.3 cleanup

`flushEffects()`에서 이전 cleanup이 있으면 먼저 실행한다 (`src/runtime/index.js:227-230`).

그 다음 새 effect를 실행한다 (`232`).

이 동작은 `tests/runtime/useEffect.test.js:12-40`에서 검증된다.

시나리오:

1. mount → `run:0`
2. unrelated state 변경 → deps unchanged라 effect 재실행 안 함
3. count 변경 → `cleanup:0`, `run:1`

즉, React의 effect 생명주기 핵심만 추려서 구현한 것이다.

### 12.4 한계

- unmount cleanup API 없음
- layout effect 없음
- effect priority 없음
- passive effect queue 분리 없음

---

## 13. useMemo 상세 분석

구현 위치: `src/runtime/index.js:335-348`

hook shape:

```js
{
  kind: "memo",
  deps,
  value,
}
```

동작:

1. 같은 slot의 memo hook 확보
2. deps 변경 여부 확인
3. 바뀌면 `factory()` 실행 후 결과 저장
4. 안 바뀌면 기존 value 재사용

이 동작은 `tests/runtime/useMemo.test.js:12-46`에서 검증된다.

예시:

- `count`에만 의존하는 memo 계산
- `query`만 바뀌면 재계산하지 않음
- `count`가 바뀌면 재계산

즉, 현재 구현의 `useMemo`는 “파생 데이터 캐시” 역할에 충실하다.

---

## 14. 훅 순서가 실제 앱에서 어떻게 배치되는가

루트 앱 `BoardRoot`는 `src/app/mountCodingBoard.js:19-47`에 있다.

렌더 시 hook slot은 아래처럼 고정된다.

| slot | hook | 의미 |
| --- | --- | --- |
| 0 | `useState` | `tasks` |
| 1 | `useState` | `titleInput` |
| 2 | `useState` | `teamInput` |
| 3 | `useState` | `priorityInput` |
| 4 | `useState` | `teamFilter` |
| 5 | `useState` | `statusFilter` |
| 6 | `useState` | `sortMode` |
| 7 | `useState` | `searchQuery` |
| 8 | `useMemo` | `summary` |
| 9 | `useMemo` | `visibleTasks` |
| 10 | `useEffect` | `document.title` 동기화 |
| 11 | `useEffect` | `localStorage` 저장 |

이 순서는 절대 바뀌면 안 된다.

예를 들어 조건문 안에서 `useEffect`를 추가하면 이후 slot이 모두 밀리므로 런타임 에러 또는 잘못된 훅 재사용이 발생한다.

---

## 15. Virtual DOM / diff / patch와의 연결

현재 hook 시스템은 혼자 존재하지 않는다. 실제 화면 변경은 기존 Virtual DOM 엔진이 담당한다.

### 15.1 renderTo: 최초 렌더

`src/lib/renderTo.js:14-19`

최초 렌더는 단순하다.

1. VNode를 DOM으로 변환
2. container 자식을 통째로 교체

즉, mount 단계는 full render다.

### 15.2 diff: 업데이트 계산

`src/lib/diff.js:7-114`

`diff(oldVdom, newVdom)`는 두 트리를 재귀적으로 걷는다.

규칙:

- old가 없고 new가 있으면 `ADD`
- new가 없으면 `REMOVE`
- nodeType 다르면 `REPLACE`
- text 값 다르면 `TEXT`
- element type 다르면 `REPLACE`
- props 차이 있으면 `PROPS`
- children은 index 기준으로 재귀 비교

중요:

- key 기반 diff가 아니다.
- child reorder 최적화가 없다.
- sibling identity 보존은 index 구조가 유지될 때만 잘 동작한다.

### 15.3 applyPatches: 실제 DOM 수정

`src/lib/applyPatches.js:8-237`

patch 적용 순서:

1. REMOVE
2. TEXT / REPLACE / PROPS
3. ADD

이 순서가 중요한 이유:

- 먼저 지워야 path 흔들림이 줄어든다.
- 마지막에 add 해야 기존 인덱스 기준 계산과 충돌이 적다.

### 15.4 rootDom 참조 유지

`FunctionComponent.update()`는 `applyPatches` 반환값으로 `rootDom`를 갱신한다 (`src/runtime/index.js:191-193`).

이게 필요한 이유:

- 루트가 `REPLACE`되면 DOM 루트 객체 자체가 바뀔 수 있다.
- 그 경우 이후 patch 기준 루트 참조도 갱신해야 한다.

---

## 16. 이벤트 시스템이 hooks와 연결되는 방식

상태 변경이 실제로 일어나려면 click/input 이벤트가 DOM에 연결돼야 한다.

이 역할은 `src/lib/domProps.js:1-66`이 맡는다.

### 16.1 이벤트 prop 등록

```js
if (propertyKey.startsWith("on")) {
  element[propertyKey] = typeof value === "function" ? value : null;
  return;
}
```

즉:

- `onclick`, `oninput`, `onchange` 같은 prop은 attribute가 아니라 DOM property에 직접 연결된다.

### 16.2 이벤트 prop 제거

```js
element[propertyKey] = null;
element.removeAttribute(attributeName);
```

즉, 교체와 제거도 안전하다.

이 동작은 `tests/runtime/events.test.js:9-59`에서 검증된다.

### 16.3 왜 이게 hook 시스템에 중요하나

예를 들어 `BoardRoot`에서:

```js
onTitleInput: (event) => setTitleInput(event.target.value)
```

이 함수가 input DOM의 `oninput`에 들어간다.

사용자가 입력하면:

1. DOM 이벤트 발생
2. handler 실행
3. `setTitleInput` 호출
4. state hook slot 갱신
5. `instance.update()` 실행
6. 새 VNode 계산
7. diff
8. patch
9. effect flush

즉, UI 상호작용이 훅 시스템에 진입하는 입구는 이벤트 prop이다.

---

## 17. 실제 앱에서의 상태 흐름

## 17.1 초기 mount

`mountCodingBoard`는 `src/app/mountCodingBoard.js:100-111`에 있다.

순서:

1. `new FunctionComponent(BoardRoot, {}, { onCommit })`
2. `instance.mount(appRoot)`
3. mount 후 디버그 스냅샷을 `debugRoot`에 렌더

### onCommit의 의미

`onCommit`은 런타임 커밋 직후 실행된다.

현재 구현에서는 디버그 패널을 별도 루트에 렌더링하는 용도로 사용한다.

즉, 사용자 앱과 디버그 앱은 분리된 DOM 루트를 갖지만, 둘 다 같은 runtime snapshot을 공유한다.

## 17.2 초기 state 생성

`tasks`는 lazy initializer로 `readInitialTasks()`를 쓴다 (`src/app/mountCodingBoard.js:20`).

즉:

- localStorage에 저장값이 있으면 그걸 씀
- 없거나 invalid면 sample tasks 사용

이렇게 초기화 함수를 넘긴 이유는 첫 렌더에만 읽기 위해서다.

## 17.3 파생 데이터

`summary`와 `visibleTasks`는 `useMemo`로 계산된다 (`src/app/mountCodingBoard.js:29-39`).

의미:

- `summary`: 전체/완료/남은 작업/완료율
- `visibleTasks`: 필터, 검색, 정렬까지 적용된 목록

따라서 unrelated state가 바뀌어도 deps가 같으면 재계산하지 않는다.

## 17.4 side effects

### title effect

`src/app/mountCodingBoard.js:41-43`

남은 작업 수가 바뀔 때만 `document.title`을 갱신한다.

### storage effect

`src/app/mountCodingBoard.js:45-47`

tasks가 바뀔 때마다 localStorage에 직렬화해서 저장한다.

이 구조가 좋은 이유:

- UI 계산과 외부 시스템 동기화를 분리한다.
- side effect를 render 바깥으로 내보낸다.

---

## 18. “작업 추가”가 실제로 어떻게 흐르는가

버튼은 `codingBoardApp.js:261-269`에서 만들어지고 `onclick: onAddTask`를 가진다.

루트 handler는 `mountCodingBoard.js:66-78`에 있다.

전체 흐름:

1. 사용자가 `작업 등록` 클릭
2. DOM의 `onclick` 실행
3. `onAddTask()` 호출
4. 빈 문자열이 아니면 새 task draft 생성
5. `setTasks((currentTasks) => [...currentTasks, newTask])`
6. state hook 0번 값 갱신
7. `instance.update()` 호출
8. `BoardRoot` 다시 실행
9. `tasks`가 달라졌으므로
   - `summary` memo 재계산
   - `visibleTasks` memo 재계산
   - storage effect 예약
   - title effect는 remaining이 변하면 예약
10. 새 VNode와 이전 VNode를 diff
11. 새 카드 추가에 해당하는 `ADD` patch 생성 가능
12. 실제 DOM patch 적용
13. effect flush로 localStorage 저장
14. debug snapshot 생성
15. debug panel 업데이트

이 흐름은 `tests/integration/codingBoard.test.js:72-94`에서 검증한다.

---

## 19. “완료 토글”이 실제로 어떻게 흐르는가

토글 버튼은 `codingBoardApp.js:392-400`에서 생성된다.

클릭 시:

```js
onclick: () => onToggle(task.id)
```

루트 handler는 `mountCodingBoard.js:57-65`.

흐름:

1. task id를 받아 현재 tasks 배열을 map
2. 해당 task만 `{ ...task, done: !task.done }`
3. `setTasks` 호출
4. update 시작
5. 새 VNode 계산
6. done 상태에 따라 카드 class / 텍스트 / summary / title이 일부 바뀜
7. diff가 `PROPS`, `TEXT` 중심 patch 생성
8. patch 적용
9. effect flush

즉, 상태 토글은 DOM imperative 조작 없이 순수 데이터 변경만으로 표현된다.

---

## 20. 디버그 패널은 왜 중요한가

`buildDebugPanelVdom`은 `src/app/codingBoardApp.js:457-485`에 있다.

디버그 패널은 현재 런타임 내부를 눈으로 보이게 만든다.

표시 내용:

- `Render Count`
- hook slot 요약
- patch log
- effect log

이 패널 덕분에 아래를 직접 관찰할 수 있다.

- 어떤 state가 몇 번째 slot에 저장되는지
- 어떤 업데이트가 `TEXT` patch인지 `PROPS` patch인지
- effect가 실제로 언제 실행되는지
- memo hook이 slot으로 존재한다는 사실

즉, 학습 도구로서 가치가 매우 높다.

---

## 21. 테스트가 보장하는 것

## 21.1 createElement

`tests/runtime/createElement.test.js:5-53`

보장:

- children flatten
- primitive child → text vnode
- 함수형 자식 컴포넌트 실행
- `children` prop 전달

## 21.2 FunctionComponent

`tests/runtime/functionComponent.test.js:6-58`

보장:

- mount가 초기 렌더 수행
- update가 patch 기반으로 DOM 일부만 수정
- 안정적인 형제 DOM 재사용
- `lastPatches` 기록

## 21.3 useState

`tests/runtime/useState.test.js:10-69`

보장:

- 상태 유지
- functional update
- same-value no-op
- child component에서 훅 금지

## 21.4 useEffect

`tests/runtime/useEffect.test.js:11-59`

보장:

- deps 변경 시 cleanup 후 재실행
- unrelated state 변경 시 effect 미재실행
- child component에서 훅 금지

## 21.5 useMemo

`tests/runtime/useMemo.test.js:11-65`

보장:

- stable deps에서 memo cache 재사용
- deps 변경 시 재계산
- child component에서 훅 금지

## 21.6 Integration

`tests/integration/codingBoard.test.js:41-135`

보장:

- 초기 렌더
- 새 작업 추가
- 완료 토글
- 필터 / 검색 / 정렬
- localStorage 복원
- debug panel 반영

즉, 현재 hook 시스템은 단위 테스트와 통합 테스트 두 층에서 검증된다.

---

## 22. 현재 구현과 실제 React의 가장 큰 차이

이 구현은 학습 목적에 매우 적합하지만, 실제 React와는 구조적으로 차이가 크다.

### 22.1 컴포넌트 인스턴스 모델

현재 구현:

- 루트 `FunctionComponent` 하나만 인스턴스화
- 자식 함수형 컴포넌트는 즉시 실행되는 pure function

React:

- 각 함수형 컴포넌트마다 Fiber/instance에 해당하는 구조가 존재
- 각 컴포넌트가 자체 hook state를 소유

### 22.2 reconciliation

현재 구현:

- index 기반 child diff
- key 지원 없음

React:

- key 기반 reconciliation
- child reorder 최적화

### 22.3 state scheduling

현재 구현:

- `setState` 즉시 동기 `update()`
- batching 없음

React:

- 업데이트 큐
- batching
- concurrent scheduling 가능

### 22.4 effect 시스템

현재 구현:

- `useEffect`만 있음
- mount/unmount lifecycle 최소화

React:

- passive effect / layout effect 분리
- commit phase가 더 정교함

### 22.5 hook 규칙 검사

현재 구현:

- root-only, slot order mismatch 정도만 검사

React:

- 훅 호출 위치와 순서에 대한 더 넓은 규칙 체계

---

## 23. 현재 설계의 장점

이 구현은 제한이 크지만 교육적으로는 오히려 장점이 많다.

### 23.1 훅의 본질이 드러난다

`hooks` 배열과 `hookIndex`만 봐도 “왜 같은 순서가 중요한지”가 바로 이해된다.

### 23.2 Virtual DOM의 역할이 선명하다

`setState`가 직접 DOM을 건드리지 않고 `VNode -> diff -> patch`로 연결되는 흐름이 매우 명확하다.

### 23.3 디버깅이 쉽다

구조가 단순하고 debug snapshot까지 제공하므로 내부 상태 추적이 쉽다.

### 23.4 요구사항에 정확히 맞다

- 함수형 컴포넌트
- 루트 상태 관리
- 루트 전용 hooks
- Virtual DOM 재사용

이번 과제 요구와 잘 맞는다.

---

## 24. 현재 설계의 한계와 개선 아이디어

### 24.1 root-only limitation

현재는 자식 컴포넌트가 state를 전혀 가질 수 없다.

개선 방향:

- 컴포넌트별 instance/fiber 개념 도입
- 각 컴포넌트마다 별도 hooks 배열 관리

### 24.2 unmount cleanup 없음

현재는 effect 재실행 전 cleanup만 있다.

개선 방향:

- 인스턴스 dispose/unmount API 추가
- unmount 시 effect cleanup 전부 실행

### 24.3 batching 없음

`setTasks(...)` 후 `setTitleInput("")`가 각각 렌더를 일으킨다.

개선 방향:

- microtask queue 기반 update batching
- 같은 tick 업데이트를 한 번에 묶기

### 24.4 key reconciliation 없음

리스트 reorder 시 DOM identity 보존이 약하다.

개선 방향:

- child diff에 `key` 개념 도입
- keyed list reconciliation 추가

### 24.5 debug snapshot의 구조화 부족

지금은 문자열 로그 중심이다.

개선 방향:

- patch log를 구조화된 객체로 유지
- effect timing metadata 추가

---

## 25. 핵심 요약

현재 구현의 핵심을 한 문장으로 요약하면 아래와 같다.

> 루트 `FunctionComponent` 인스턴스가 `hooks` 배열에 상태를 저장하고, 렌더 때마다 `hookIndex`를 0부터 다시 세면서 같은 순서의 hook 호출을 같은 slot에 매핑하고, 상태가 바뀌면 새 VNode를 계산해 기존 VNode와 diff한 뒤 필요한 DOM patch만 적용한다.

좀 더 쪼개면:

1. 함수는 매 렌더마다 다시 실행된다.
2. 상태는 함수 내부가 아니라 인스턴스의 `hooks` 배열에 저장된다.
3. 훅 순서는 `hookIndex`로 식별된다.
4. child 함수형 컴포넌트는 인스턴스가 아니라 pure function이다.
5. `setState`는 직접 DOM을 건드리지 않고 `update()`를 호출한다.
6. `update()`는 `render -> diff -> patch -> effect flush` 순서로 동작한다.
7. `useEffect`는 렌더 중 예약되고 커밋 후 실행된다.
8. `useMemo`는 deps가 같으면 이전 계산값을 재사용한다.

이 구조를 이해하면 현재 프로젝트의 런타임은 물론, 실제 React hook 시스템이 왜 “호출 순서”와 “컴포넌트 인스턴스”에 집착하는지도 자연스럽게 이해할 수 있다.

---

## 26. 빠르게 다시 볼 포인트

처음부터 다시 읽기 전에 핵심 코드만 빠르게 훑고 싶다면 아래 순서가 가장 좋다.

1. `src/runtime/index.js:8-12`
   - renderContext
2. `src/runtime/index.js:94-114`
   - getHook
3. `src/runtime/index.js:128-144`
   - createElement
4. `src/runtime/index.js:162-206`
   - mount / update
5. `src/runtime/index.js:285-348`
   - useState / useEffect / useMemo
6. `src/app/mountCodingBoard.js:19-47`
   - 실제 hook 사용 순서
7. `src/lib/diff.js:21-99`
   - VDOM diff
8. `src/lib/applyPatches.js:117-209`
   - DOM patch 적용

이 8개 구간을 이해하면 현재 시스템의 거의 전부를 설명할 수 있다.
