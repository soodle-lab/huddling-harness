---
name: run-harness
description: 허들링 시안 하네스를 실행한다. "<화면명> 시안 만들어줘" 또는 "이어서 해줘"가 들어오면 사용한다. S1~S5를 researcher·designer·judge로 순서대로 진행하고 사람 승인을 받는다.
---

오케스트레이터(메인 세션) 절차다. 규칙의 원본은 harness/design/R2~R7과 harness/rules.json이다. 여기에는 순서만 적는다.

## 시작
1. 화면 이름을 harness/rules.json의 screens slug로 바꾼다. 목록에 없으면 멈추고 묻는다.
2. harness/runs/<slug>/ 각 파일 첫머리의 `status:`를 읽고, passed가 아닌 첫 단계부터 시작한다. 폴더가 없으면 만든다.

## 단계 (한 단계가 끝날 때마다 judge로 게이트를 검사하고, 통과하면 그 파일 첫머리에 status: passed를 기록)
| 단계 | 일하는 에이전트 | 게이트 |
|---|---|---|
| S1 수집 | researcher | G1 |
| S2 분석 | researcher | G2, 통과하면 👤 사람 승인(A2) 대기 |
| S3 설계 | designer | G3 |
| S4 사전점검 | judge | G4 (결과를 04-precheck.md에 기록) |
| S5 시안 | designer, 이어서 judge가 Figma 값 조회 | G5, 통과하면 👤 사람 승인(A5) 대기 |

## 복귀
S2 반려→S1, S4 위반→S3, S5 위반→S5. 되돌아가면 그 단계 이후 파일의 status를 stale로 바꾼다.
단계당 재시도 2회. 넘기면 멈추고 실패 항목과 함께 나에게 보고한다.

## 사람 승인 (G2, G5)
승인 파일 `harness/runs/<slug>/approval.md`는 **사람만** 만든다. 에이전트와 오케스트레이터는 쓸 수 없다(훅이 막음).
1. G2(또는 G5)가 통과하면, 사람에게 "approval.md에 `G2: approved`(또는 `G5: approved`) 줄을 적어 달라"고 요청하고 멈춘다.
2. 사람이 알렸을 때 judge로 `A2`(또는 `A5`)를 돌려 통과해야만 다음 단계로 간다.
3. 승인 뒤에 승인 대상 파일이 바뀌면 승인은 무효다. 다시 요청한다.
S3 설계서(03-spec.md)는 A2 통과 전에는 훅이 쓰기를 막는다.

## 재시도 한도
verify.mjs가 실패 횟수를 기록한다. 결과에 `halt: true`(종료코드 3)가 나오면 즉시 멈추고 실패 항목과 함께 사람에게 보고한다.

## 하지 말 것
R7-orchestrator.md의 4가지를 지킨다. 특히 judge의 실패를 뒤집지 않는다.
