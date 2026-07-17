# Routiner 아키텍처·패치 가이드

이 문서는 파일 목록이 아니라 **Routiner를 안전하게 수정하기 위한 작업 기준**이다.
현재 `main`의 실제 코드가 최종 source of truth이며, 코드 구조나 계약을 바꾸는 패치에서는 이 문서도 같은 커밋에서 갱신한다.

## 1. 앱의 형태

- GitHub Pages에서 바로 실행되는 정적 PWA다. 빌드·번들 과정이 없다.
- `index.html`은 고정 DOM 골격과 asset 연결만 가진다.
- `styles/app.css`가 현재 화면의 전체 CSS cascade를 가진다.
- `src/app.js`가 일반 스크립트를 정해진 순서로 불러온다.
- 각 JavaScript 파일은 같은 전역 scope를 공유하므로 **파일 순서가 의존성 계약**이다.
- 로컬 저장과 Firestore 동기화가 함께 존재한다.

## 2. 패치 전에 반드시 확인할 것

1. 사용자의 현재 요청과 확정된 patch ticket을 먼저 읽는다.
2. `main`의 최신 대상 파일을 다시 가져온다.
3. 아래 변경 경로에서 1차 담당 파일을 고른다.
4. 저장 키·routine/step ID·schema·동기화 범위에 영향이 있는지 확인한다.
5. 기능 변경과 구조 정리, CSS 정리를 한 패치에 섞지 않는다.

## 3. 변경 경로

| 요청 종류 | 1차 담당 파일 | 함께 확인할 파일 |
|---|---|---|
| 앱 버전, 저장·백업·Firestore 상수 | `src/config.js` | `src/storage.js`, `src/sync.js` |
| 기본 루틴, 단계 순서·시간·메모 | `src/data/default-routines.js` | `src/storage.js`의 migration |
| 날짜, day plan, 기본 state shape | `src/state-model.js` | `src/storage.js`, `src/calendar.js` |
| 저장, 불러오기, 기존 데이터 보정 | `src/storage.js` | `src/config.js`, `src/state-model.js` |
| 로그인, Firestore, 기기간 충돌 | `src/sync.js` | `src/storage.js`, `src/runner.js` |
| 세션 구조와 시간 계산 | `src/session.js` | `src/runner.js`, `src/storage.js` |
| 홈 화면과 화면 전환 | `src/ui.js` | `styles/app.css` |
| 월간 캘린더 | `src/calendar.js` | `src/state-model.js`, `styles/app.css` |
| 실행 화면, 타이머, 이전·다음·완료 | `src/runner.js` | `src/session.js`, `src/sync.js` |
| 루틴·단계 편집 | `src/editor.js` | `src/storage.js`, `styles/app.css` |
| 토스트, 저장 표시, 완료 보상 | `src/feedback.js` | `styles/app.css` |
| 실행 중 전역 mutable 값 | `src/runtime.js` | 값을 사용하는 기능 파일 |
| 스크롤 경계·overscroll | `src/scroll.js` | `styles/app.css` |
| 백업 UI 동작 | `src/backup.js` | `src/storage.js`, `src/sync.js` |
| 고정 DOM 이벤트 연결 | `src/events.js` | 실제 동작을 소유한 기능 파일 |
| URL 진입과 최종 초기화 | `src/bootstrap.js` | `src/app.js` |
| 간격, 크기, 색상, safe area | `styles/app.css` | 해당 화면 기능 파일 |

`src/events.js`에는 새 기능 로직을 넣지 않는다. 이벤트는 담당 기능의 함수를 호출하기만 해야 한다.

## 4. 절대 보존할 계약

### 저장과 기존 데이터

- 로컬 저장 키 `personal_routine_v01`을 바꾸지 않는다.
- `ROUTINE_SCHEMA_VERSION`은 단순 버전 표시가 아니다. 값이 달라지면 기본 루틴을 다시 구성하고 session·completed·offToday 일부를 초기화하는 경로가 실행된다.
- 따라서 schema 변경은 **사용자가 기존 데이터를 재설정하는 결과를 명시적으로 승인한 경우에만** 한다.
- routine ID와 step ID는 migration, session, calendar 기록의 연결점이다. 이름만 바꾸는 패치에서도 ID는 유지한다.
- 기본값만 바꾸려면 `default-routines.js`를 수정한다. 기존 저장 데이터까지 안전하게 바꿔야 한다면 `storage.js`에 조건이 좁은 migration을 추가한다.
- migration은 사용자가 수정한 값까지 덮지 않도록, 이전 기본값과 정확히 일치하는 경우에만 적용한다.

### 백업과 동기화

- `BACKUP_TAG`, `BACKUP_SCHEMA`, `FIRESTORE_TAG`, `FIRESTORE_SCHEMA`, `FIRESTORE_DOC_ID`를 이유 없이 바꾸지 않는다.
- Firestore에는 로컬 state 전체가 그대로 올라가지 않는다. `cloudStateSlice()`의 범위와 `activeRun`이 동기화 계약이다.
- 로컬 session 실행 상태와 cloud active-run 잠금은 같은 개념이 아니다. 한쪽을 수정할 때 다른 쪽의 충돌 처리도 확인한다.
- 원격 state 적용은 반드시 기존 normalize 경로를 거쳐야 한다.

### 로드 순서와 엔트리 파일

- `src/app.js`의 로드 순서를 임의로 바꾸지 않는다.
- `runtime.js` 초기화를 storage·sync·runner 함수 정의보다 앞으로 옮기지 않는다.
- 일반적인 루틴·문구·타이머·캘린더·스타일 패치에서는 `index.html`을 수정하지 않는다.
- 새 고정 root, 새 외부 asset, manifest/style/script 연결이 필요한 경우에만 `index.html`을 수정한다.
- 새 기능 영역을 별도 파일로 만들 때만 `src/app.js`에 파일을 추가한다.

## 5. 안전한 패치 절차

1. patch ticket에서 `변경할 것 / 절대 하지 말 것 / 성공 조건`을 확정한다.
2. 1차 담당 파일부터 읽고, 호출되는 함수와 저장 경로까지만 추적한다.
3. 최소 범위로 수정한다. 관계없는 정리·이름 변경·포맷팅은 하지 않는다.
4. 데이터 영향이 있으면 기존 state, 기본 state, 오래된 state 세 경우를 따로 검토한다.
5. 모든 JavaScript 문법과 로컬 asset 경로를 검사한다.
6. 390×844 Preview에서 해당 사용자 흐름을 처음부터 끝까지 실행한다.
7. Preview 확인 전 완료라고 단정하지 않는다.

## 6. 변경 종류별 검증

### 기본 루틴 변경

- 기본 재설정 후 새 단계·순서·시간·메모가 정확하다.
- 기존 커스텀 루틴은 의도하지 않게 덮이지 않는다.
- migration 대상과 비대상 데이터가 구분된다.
- routine/step ID가 유지된다.

### 실행·타이머 변경

- 시작, 일시정지, 건너뛰기, 이전 단계, 완료가 정상이다.
- 마지막 단계 전환과 완료 보상이 정상이다.
- 다른 기기의 active run과 충돌할 때 확인 흐름이 유지된다.
- 화면 잠금·복귀 후 elapsed 계산이 깨지지 않는다.

### 저장·동기화 변경

- 빈 저장소, 현재 저장 데이터, 이전 형식 데이터가 모두 열린다.
- local write가 불필요한 cloud save loop를 만들지 않는다.
- 로그인, 최초 local/cloud 선택, 원격 적용, 로그아웃을 확인한다.
- 백업 export/import가 같은 state로 복원된다.

### UI·CSS 변경

- 홈, 실행, 편집, 캘린더, 백업 화면을 확인한다.
- 390×844에서 잘림·가로 overflow·safe-area 침범이 없다.
- 실행 화면의 타이머·메모·완료 버튼이 동시에 보인다.
- overscroll 방지와 필요한 내부 스크롤이 함께 유지된다.

## 7. 금지되는 패치 방식

- 사용자 요청과 무관한 기능 추가
- schema bump로 migration을 대신하기
- `index.html`에 기능 코드나 CSS를 다시 넣기
- `events.js`에 상태 변경 로직 몰아넣기
- 기능 패치와 대규모 CSS 정리를 동시에 하기
- 테스트를 통과시키기 위해 저장 계약이나 검수 조건을 느슨하게 만들기
- 기존 파일이 있다는 이유만으로 내용을 확인하지 않고 추측해 수정하기

## 8. 완료 조건

- patch ticket 범위만 변경됐다.
- 저장 키와 기존 데이터 호환 조건이 유지됐다.
- 담당 파일과 실제 변경 위치가 일치한다.
- 문법·asset 검사가 통과했다.
- 관련 사용자 흐름을 Preview에서 확인했다.
- 구조·계약이 달라졌다면 이 문서도 함께 갱신됐다.
