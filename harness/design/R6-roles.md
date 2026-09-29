# 역할 (R6)

> 참조: [R3-pipeline.md](R3-pipeline.md), [R4-artifacts.md](R4-artifacts.md), [R5-gates.md](R5-gates.md)

## 에이전트

| 역할 | 하는 일 | 편집 가능 | 도구 |
|---|---|---|---|
| researcher | S1 수집, S2 분석 | `harness/runs/<화면>/01-references.md`, `02-analysis.md` | uibowl MCP (읽기), 파일 쓰기 |
| designer | S3 설계, S5 시안 | `harness/runs/<화면>/03-spec.md`, `05-screen.md` + Figma 프레임 1개 | Figma MCP (쓰기), 파일 쓰기 |
| 판정자 | G1~G5 검사 (S4 사전점검 포함) | 없음 (읽기 전용) | 파일 읽기, Figma MCP 노드 속성 조회 (읽기 전용) |

- 판정자의 출력: 통과/실패 + 실패 항목 목록. 파일에 쓰지 않고 오케스트레이터에 반환한다.
- 04-precheck.md는 판정자가 S4에서 낸 결과를 오케스트레이터가 기록한다.

## 오케스트레이터 (메인 세션, CLAUDE.md 기준)

- 단계 순서 진행
- `status: passed` / `stale` 기록 (판정자가 읽기 전용이므로 오케스트레이터가 씀)
- 재시도 횟수 관리 (단계당 2회)
- 👤 사람 승인 요청 (G2, G5)

## 확정 사항

- G3 설계서 필수 섹션: 목적 / 구성 요소 / 권한별 차이
- 자연어 트리거: `"<화면명> 시안 만들어줘"` (이어하기: `"이어서 해줘"`)

## 미확정 · 주의

- 편집 폴더가 researcher와 designer 모두 `harness/runs/<화면>/`이다. 폴더가 아니라 파일 단위로 권한을 나눴다. 폴더 분리를 원하면 R4 경로를 바꿔야 한다.
- Figma 커넥터(plugin:figma)가 세션에서 인증 필요 상태로 표시됨. designer의 쓰기와 판정자의 조회가 모두 의존하므로, 실제 실행 전에 claude.ai 커넥터 설정에서 인증해야 한다.
