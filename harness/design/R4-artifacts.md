# 산출물 (R4)

> 참조: [R3-pipeline.md](R3-pipeline.md)

## 폴더와 파일

폴더: `harness/runs/<화면명>/`  (예: `harness/runs/skill-library/`)

| 파일 | 단계 | 내용 |
|---|---|---|
| 01-references.md | S1 수집 | 레퍼런스 목록 (≥5건, uibowl URL) |
| 02-analysis.md | S2 분석 | 반영할 부분 목록 (근거 번호) |
| 03-spec.md | S3 설계 | 화면 설계서 |
| 04-precheck.md | S4 사전점검 | 위반 예상 목록 |
| 05-screen.md | S5 시안 | Figma 프레임 링크 + 프레임 크기 + 위반 검사 결과 |

## 규칙 SSOT

- 파일: `harness/rules.json` (1개, 스크립트가 읽는 JSON. 사람이 읽는 rules.md는 없앰)
- 출처: design.md의 셀 수 있는 규칙 + R1-A-story-service.md의 "어기면 안 되는 것" 2개
- 판정 스크립트는 이 파일만 읽는다.
- 내용은 R5(게이트)에서 확정한다. 이 라운드에서는 파일명과 역할만 정한다.

## 재개 규칙

- 각 단계 파일 첫머리에 `status: passed`를 기록한다.
- 다시 시작하면 `status: passed`인 단계는 건너뛰고 그다음 단계부터 실행한다.
- 되돌아갈 때는 돌아간 단계 이후 파일의 status를 `stale`로 바꾼다.
  (예: S2 반려 → S1 재실행, 02~05는 stale)
- 별도의 state.json은 쓰지 않는다.
- 이유: 파일 존재만으로 건너뛰면, 되돌아간 뒤 예전 파일이 통과된 것처럼 오인될 수 있다.

## 강제 장치가 다루는 파일

| 파일 | 누가 쓰나 | 강제 |
|---|---|---|
| `approval.md` | 사람만 (`G2: approved`, `G5: approved` 줄) | guard-write.mjs가 모든 에이전트·메인의 쓰기를 막음. 승인 뒤 대상 파일이 바뀌면 무효 |
| `.retries.json` | verify.mjs만 | guard-write.mjs가 쓰기를 막음. 재시도 한도 초과 시 halt |
| `05-figma.json` | 오케스트레이터 (판정자가 읽어 온 값을 저장) | G5 입력 |
