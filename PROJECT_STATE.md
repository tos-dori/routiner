---
id: routiner-project-state
kind: project-state
status: active
project: Routiner
continuity: automatic-checkpoint
---

# Routiner Project State

## 목적

Routiner는 외부 강제력이 약한 날에도 **생활의 전환 시점을 놓치지 않게 개입하고, 시작한 뒤에는 필요한 행동을 순서대로 실행하도록 밀어주는** 개인용 실행 보조 PWA다.

이 문서는 여러 ChatGPT 채팅이 같은 프로젝트 맥락을 이어받기 위한 공식 continuity snapshot이다. 전체 대화나 세부 코드 설명을 복사하지 않고, 다음 작업의 판단이 달라지는 현재 상태·결정·미해결·다음 시작점만 유지한다.

## 공식 원본과 우선순위

- 실제 구현과 설정: 현재 `main`의 코드
- 데이터 보존·동기화·비공개 기본값 불변조건: `DATA_SAFETY.md`
- 아키텍처·개발 계약: `ARCHITECTURE.md`
- 프로젝트 연속성 상태: 이 파일
- 공통 AI 운영 계약: `tos-dori/tos-ai-control`
- 화면·실행 결과·로그가 문서와 충돌하면 실제 상태를 먼저 검증한다.

## 연속성 운영

- 새 채팅 첫 메시지에서 `@GitHub 토스 루티너 <현재 작업>`으로 시작한다.
- 같은 채팅에서는 이후 메시지마다 `토스`나 `@GitHub`를 반복하지 않는다.
- `토스`가 활성화된 작업에서 지속 가치가 있는 검증된 변화는 이 파일에 최소 checkpoint한다.
- 자동 checkpoint는 현재 상태·결정·검증 결과·미해결·다음 작업에 한정한다.
- 앱 코드 패치, 삭제, 공통 guide·Skill·backlog 변경은 별도의 명시적 요청이 필요하다.
- 후보 아이디어, AI 추측, 검증되지 않은 패치와 단순 대화는 공식 상태로 기록하지 않는다.

## 현재 확인된 상태

- `main` 기준 정적 PWA이며 빌드·번들 과정 없이 GitHub Pages에서 실행된다.
- 앱 버전은 `1.58`, local canonical 저장 키는 `personal_routine_v01`, Firestore state schema는 4다.
- `index.html`은 고정 DOM과 asset 연결, `styles/app.css`는 화면 CSS, `src/app.js`는 전역 스크립트 로드 순서를 담당한다.
- 홈, 실행, 완료, 편집, 달력, 로그인·관리 메뉴 흐름이 코드에 존재한다.
- 현재 시간대 추천은 앱이 열린 상태에서 루틴 카드를 강조하는 수준이며, 앱 밖에서 전환 시점을 놓치지 않게 하는 공통 개입 흐름은 아직 구현되지 않았다.
- 데이터 안전 v2가 `main`에 병합되어 있다. 12개 독립 local checkpoint, corrupt quarantine, destructive operation 강제 checkpoint, schema-4 revision/hash 동기화, 50개 cloud history slot, 탭·기기 conflict 보존, 최대 20개 stale conflict 정리, 750 KiB cloud payload 사전 차단, 오프라인 재시도 구조를 사용한다.
- timer의 1초 저장은 checkpoint ring을 소모하지 않는다. 실행 중 session data는 일반 cloud canonical state에 포함시키지 않고, `activeRun` lock은 별도 제한된 필드 업데이트로 취급한다.
- 동시 수정 시 canonical `main`을 덮지 않고 local candidate를 `main/conflicts/{clientId}`에 보존한다. state transaction은 최신 active-run lock을 보존한다.
- reset·import·remote replacement·restore·schema migration은 기존 상태를 먼저 checkpoint하며, checkpoint 또는 canonical local write 실패 시 동작을 중단하거나 원상복구한다.
- Firestore owner-only schema-4 rules는 사용자 확인 후 client 병합 전에 게시됐다. Rules emulator, local failure, privacy, private-default validation, 390×844 migration/recovery/UI test를 통과한 코드가 `main`에 반영됐다.
- 개인화된 기본 루틴은 공개 repository HEAD에서 제거됐다. 공개 client에는 비개인 bootstrap shell만 남고, 로그인한 사용자 전용 `users/{uid}/routiner/private-defaults` 문서를 direct server read + canonical hash 검증한 뒤에만 기본 루틴으로 사용한다.
- 사용자가 실제 앱에서 `비공개 기본값 검증됨` 상태를 확인했다. 검증되지 않았거나 누락·손상된 private-defaults 문서는 public client가 임의 생성·덮어쓰기하지 않는다.
- `기본 루틴으로 재설정`은 검증된 private-defaults가 있을 때만 작동하며, 재설정 전에 checkpoint를 만든다. 기본값 검증 실패 시 현재 루틴을 건드리지 않는다.
- 제목을 길게 눌러 여는 관리 메뉴가 적용되어 있고, 1차 메뉴는 `복구본 · 내보내기 · 가져오기 · 로그아웃`이다. 상태 문구는 확인 가능한 범위만 표시하도록 `계정 연결됨 · 기본값 검증됨` 계열로 제한했다.
- 시간 표시는 `m/s`를 사용하며 실제 조작 버튼은 입력·본문과 다른 버튼 전용 스타일 체계를 사용한다.
- 단계 삭제는 두 번 눌러야 실행된다. 첫 누름은 데이터에 손대지 않고 같은 `삭제` 문구의 시각 스타일만 강해지며, 두 번째 누름 직전에 강제 checkpoint를 만든다. 마지막 단계 보호와 저장 실패 원상복구를 유지한다.
- 편집 화면은 닫힌 단계를 약 39px의 얇은 행으로 줄이고, 현재 편집 중인 단계만 하나의 옅은 배경·테두리 panel로 묶는다. 중복 요약 카드와 불필요한 블록 중첩을 줄이고 제목·시간·메모·순서·삭제 컨트롤의 높이와 여백을 축소했다.
- 데이터 안전 병합 커밋은 `0c173770b54ff2de1ce126f305afe628e1d5468a`, 개인정보 phase 2 병합 커밋은 `9b5be70af0e78213cdadf750ca3bf0257f2d09fe`, 관리 메뉴 계열 최종 상태 이후 편집 UI 병합 커밋은 `32ad3dd01807160ffcb64e6d49941308105c22cb`다.

## 결정된 방향

- Routiner의 역할은 `전환 시점 개입`과 `시작 후 실행 안내` 두 층으로 본다. 기존 실행 화면의 장점은 유지하되, 혼자 있을 때 폰·유튜브 등으로 다음 생활 상태로 넘어가지 못하는 순간을 먼저 잡아야 한다.
- 아침·점심·저녁·밤은 별도 시스템이 아니라 하나의 공통 전환 구조로 설계한다. 밤 하나를 고립된 실험 기능으로 만든 뒤 다른 루틴으로 확장하는 방식은 기본 방향이 아니다.
- 전환 시점에는 해당 루틴을 바로 시작하거나, 잠시 미루거나, 오늘 상황에는 적용하지 않는 선택이 가능해야 한다. 미룬 전환은 사라지지 않고 다시 개입할 수 있어야 하며, 시작·완료·오늘 제외 후에는 중복 개입하지 않아야 한다.
- 루틴은 하루의 가장 이른 행동부터가 아니라 **실제로 사용자가 멈추는 지점부터 시작**한다. 종료도 항목을 다 체크했다는 사실보다 실제 생활 상태가 바뀌었는지를 기준으로 잡는다.
- 현재 큰 경계는 아침 `식사 후 → 외출`, 점심·저녁 `식사 후 → 독서실 복귀`, 밤 `디지털 사용 종료 → 취침 준비·침대` 방향으로 본다. 세부 단계·시간·문구는 큰 흐름 확정 뒤 정한다.
- 외출 루틴처럼 외부 일정 자체가 이미 전환 압력을 주는 흐름은 기존 직접 실행 보조 중심을 유지한다.
- 운동은 점심·저녁 복귀의 필수 조건으로 묶지 않는다. 스텝퍼·가벼운 스트레칭은 생활 속 낮은 마찰의 선택 행동으로, 20~30분 영상 운동·풀업 같은 구조화 운동은 별도 실행 흐름 후보로 둔다.
- 모바일에서 실행 흐름을 방해하지 않는 단순한 화면과 직접적인 조작을 우선한다.
- 기존 저장 데이터와 사용자가 편집한 루틴을 임의로 초기화하거나 덮지 않는다.
- 데이터 안전 변경에서는 `DATA_SAFETY.md`의 revision/hash·checkpoint·history·conflict·private-default·offline invariants를 회귀시키지 않는다.
- 기본 루틴은 공개 코드가 아니라 검증된 사용자 전용 private-defaults가 source of truth다.
- Step과 Routiner의 제목 관리 메뉴는 같은 1차 정보 구조를 유지하되 앱별 복구 상세 구현은 필요한 만큼 다르게 둔다.
- 편집 화면은 타이핑 입력과 조작 버튼을 시각적으로 구분하고, 한 단계 편집 때문에 화면 대부분을 불필요한 큰 블록이 차지하지 않게 한다.
- 위험 동작은 안전장치를 두되 확인 문구를 과도하게 늘리지 않고 시각 상태와 복구 가능성으로 보호한다.
- 제품 흐름·구조가 미확정인 단계에서는 전체 사용자 흐름과 구조를 넓게 검토하고 필요한 재설계를 허용한다. 큰 방향이 확정된 뒤에는 관계없는 정리나 기능을 섞지 않고 가장 작은 일관된 구현 범위로 좁힌다.
- 실제 코드·화면·테스트로 확인되지 않은 상태를 구현 완료로 기록하지 않는다.

## 최근 의미 있는 변화

- 손상 local과 client-clock last-write-wins 구조의 데이터 유실 위험을 확인한 뒤 heuristic patch를 폐기하고 revision/hash·history·conflict·local checkpoint 기반 데이터 안전 v2로 재구축했다.
- 사용자 전용 private-defaults를 server read-back/hash 검증한 뒤 공개 HEAD의 개인화 기본 루틴과 legacy 개인 문구를 제거했다.
- 제목 길게 누르기 관리 메뉴를 Step과 같은 `복구본 · 내보내기 · 가져오기 · 로그아웃` 구조로 정리했다.
- 시간 표기를 `m/s`로 바꾸고 앱 전체 실제 조작 버튼의 스타일 계층을 정리했다.
- 단계 삭제를 recoverable two-tap 방식으로 바꾸고, 확인 상태는 `삭제` 문구를 유지한 채 스타일만 변하도록 수정했다.
- 편집 화면을 카드 덩어리 구조에서 `얇은 닫힌 행 + 하나의 active edit panel` 구조로 압축했다.
- 다음 제품 개발의 큰 방향을 `공통 전환 개입 → 실제 막히는 지점부터 실행 → 실제 상태 변화까지 안내`로 확정하고, 운동은 복귀 루틴의 필수 단계에서 분리했다.
- 개발 운영 기준을 `항상 좁은 patch ticket` 방식에서 `큰 흐름·구조를 먼저 잡고, 확정 후 좁고 안정적으로 구현`하는 단계형 방식으로 갱신했다.
- 2026-08-07 continuity snapshot을 실제 `main`과 재대조해, 패치 전 last-write-wins·cloud history 없음·안전 패치 미수행 상태를 가리키던 오래된 문구를 제거했다.

## 현재 미해결·미확인

- 공통 전환 구조의 정확한 화면 배치, 개입 상태 shape, 미루기 시간 규칙, 외부 호출 방식(예: 단축어/알림)의 세부 구현은 아직 확정하지 않았다.
- 아침·점심·저녁·밤의 세부 단계와 정확한 시간은 큰 흐름이 정해진 뒤 별도로 조정해야 한다.
- 구조화 운동 흐름의 A/B/C/D 같은 구체 UX는 아직 확정하지 않았다.
- 공개 repository의 현재 HEAD에서는 개인화 기본 루틴을 제거했지만, 과거 public Git commit과 이미 만들어진 외부 clone에는 이전 plaintext 기본값이 남아 있을 수 있다. 완전한 과거 기록 제거는 repository 비공개 전환 또는 별도 승인된 history rewrite/clean migration이 필요하다.
- 브라우저 local storage와 Firebase 프로젝트를 동시에 잃는 상황을 위한 앱 밖의 독립 파일 백업은 자동화되어 있지 않다.
- 진행 중 timer/session을 다른 기기에서 그대로 이어받는 기능은 현재 목표가 아니며, session을 cloud canonical state에 포함시키는 변경은 충돌 모델을 다시 검토해야 한다.
- 자동 Workflow와 390×844 렌더 검수는 실제 iPhone/PWA 캐시 상태와 장시간 실사용 UX를 완전히 대체하지 않는다.

## 다음 시작점

1. 다음 제품 UX 작업은 아침·점심·저녁·밤 공통의 **전환 개입 사용자 흐름과 상태 경계**를 먼저 확정한다. 세부 문구·시간·디자인부터 고정하지 않는다.
2. 큰 흐름이 확정되면 현재 홈·runner·state/storage 구조를 다시 읽고, 공통 전환 상태를 가장 작은 일관된 구현 단위로 설계한다.
3. 저장·동기화·reset·import·private-default 관련 변경 전 `DATA_SAFETY.md`, 현재 data-safety/sync/private-data 코드와 관련 tests를 먼저 읽고 invariants를 보존한다.
4. 편집 UI 변경은 현재 `얇은 닫힌 행 + 하나의 active panel`, `m/s`, 버튼/입력 구분, two-tap recoverable delete를 기본 계약으로 취급한다.
5. 데이터 구조나 destructive flow를 건드리면 local failure, privacy/private-default validation, Firestore emulator, 390×844 migration/recovery/UI test를 다시 통과시킨다.
6. 필요하면 실제 기기에서 최신 배포·관리 메뉴·편집 화면과 private-default 상태를 다시 육안 확인한다.
