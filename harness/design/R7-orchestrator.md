# 오케스트레이터 (R7)

> 진입점은 루트의 [CLAUDE.md](../../CLAUDE.md)이다. 이 문서는 R7에서 정한 결정을 기록한다.
> 오케스트레이터가 하는 일(순서 진행, status 기록, 재시도 관리, 사람 승인 요청)은 [R6-roles.md](R6-roles.md)에 있다.

## 결정 사항

| 항목 | 결정 |
|---|---|
| CLAUDE.md에 담는 방식 | 핵심만 요약 + 설계 문서 링크. 상세는 원본 문서를 읽는다 |
| 새 세션 시작 순서 | CLAUDE.md → `harness/runs/<화면>/` 각 파일의 status 확인 |
| 이어하기 | passed가 아닌 첫 단계부터 시작 |

## 하지 말 것

- 사람 승인(G2·G5) 없이 다음 단계로 넘어가지 않는다.
- 재시도 2회를 넘기면 자동으로 진행하지 않고 멈춰서 보고한다.
- `harness/rules.json`과 `docs/design.md`를 임의로 수정하지 않는다.
- 판정자의 실패 결과를 오케스트레이터가 뒤집지 않는다.

## 강제 장치 (4겹)

"하지 말 것"과 역할 권한은 약속이 아니라 훅으로 막는다. 설정은 `.claude/settings.json`.

| 규칙 | 강제하는 것 |
|---|---|
| 사람 승인 없이 다음 단계 금지 | `guard-write.mjs`: G2 승인 없이는 03-spec.md 쓰기 차단. 승인 파일은 에이전트·메인 모두 쓰기 차단 |
| 재시도 2회 초과 금지 | `verify.mjs`: 실패 횟수를 기록하고 한도 초과 시 halt(종료코드 3) |
| rules.json·design.md 임의 수정 금지 | `guard-write.mjs`: 서브에이전트는 차단, 메인은 사용자에게 묻기. settings.json과 scripts/도 같음 |
| 판정자 읽기 전용 | `judge` 에이전트 도구 제한 + `guard-judge-bash.mjs`: verify.mjs 한 줄만 허용 |
| 에이전트별 편집 파일 제한 | `guard-write.mjs`: researcher 01·02, designer 03·05, judge 없음 |
| 판정자의 실패를 뒤집지 않기 | **강제 못 함 (약속)**. 판정 결과는 스크립트가 내지만, 메인이 결과를 무시하는 것은 막지 못한다 |

시험: `python3 harness/tests/guard-test.py` (훅 24개 케이스)

## 관련 문서

- 역할과 권한: [R6-roles.md](R6-roles.md)
- 게이트와 복귀: [R5-gates.md](R5-gates.md)
- 재개 규칙: [R4-artifacts.md](R4-artifacts.md)
