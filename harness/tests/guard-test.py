#!/usr/bin/env python3
"""가드 훅(guard-write.mjs, guard-judge-bash.mjs) 시험. 실제 입력 JSON을 훅에 넣어 기대 결과와 비교한다.
사용: python3 harness/tests/guard-test.py   (프로젝트 루트에서)
임시 폴더 harness/runs/zz-test를 만들었다가 지운다."""
import json, os, shutil, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RUNS = f"{ROOT}/harness/runs/zz-test"
W, B = "guard-write.mjs", "guard-judge-bash.mjs"


def run(script, tool, inp, agent=None):
    d = {"cwd": ROOT, "tool_name": tool, "tool_input": inp, "hook_event_name": "PreToolUse"}
    if agent:
        d["agent_id"] = "a1"
        d["agent_type"] = agent
    p = subprocess.run(["node", f"{ROOT}/harness/scripts/{script}"], input=json.dumps(d), capture_output=True, text=True)
    return "deny" if p.returncode == 2 else ("ask" if '"ask"' in p.stdout else "allow")


os.makedirs(RUNS, exist_ok=True)
cases = [
    ("researcher → 01 쓰기", W, "Write", {"file_path": f"{RUNS}/01-references.md"}, "researcher", "allow"),
    ("researcher → 03 쓰기", W, "Write", {"file_path": f"{RUNS}/03-spec.md"}, "researcher", "deny"),
    ("designer → 03 (G2 승인 없음)", W, "Write", {"file_path": f"{RUNS}/03-spec.md"}, "designer", "deny"),
    ("designer → 01 쓰기", W, "Edit", {"file_path": f"{RUNS}/01-references.md"}, "designer", "deny"),
    ("judge → 아무 파일", W, "Write", {"file_path": f"{RUNS}/04-precheck.md"}, "judge", "deny"),
    ("designer → 승인 파일", W, "Write", {"file_path": f"{RUNS}/approval.md"}, "designer", "deny"),
    ("메인 → 승인 파일", W, "Write", {"file_path": f"{RUNS}/approval.md"}, None, "deny"),
    ("메인 → .retries.json", W, "Write", {"file_path": f"{RUNS}/.retries.json"}, None, "deny"),
    ("designer → rules.json", W, "Edit", {"file_path": f"{ROOT}/harness/rules.json"}, "designer", "deny"),
    ("메인 → rules.json (사용자에게 묻기)", W, "Edit", {"file_path": f"{ROOT}/harness/rules.json"}, None, "ask"),
    ("메인 → docs/design.md (사용자에게 묻기)", W, "Edit", {"file_path": f"{ROOT}/docs/design.md"}, None, "ask"),
    ("researcher → docs/design.md", W, "Edit", {"file_path": f"{ROOT}/docs/design.md"}, "researcher", "deny"),
    ("메인 → 05-figma.json", W, "Write", {"file_path": f"{RUNS}/05-figma.json"}, None, "allow"),
    ("메인 → harness/design 문서", W, "Edit", {"file_path": f"{ROOT}/harness/design/R5-gates.md"}, None, "allow"),
    ("judge Bash: verify G1", B, "Bash", {"command": "node harness/scripts/verify.mjs G1 zz-test"}, "judge", "allow"),
    ("judge Bash: verify A2", B, "Bash", {"command": "node harness/scripts/verify.mjs A2 zz-test"}, "judge", "allow"),
    ("judge Bash: cat", B, "Bash", {"command": "cat harness/rules.json"}, "judge", "deny"),
    ("judge Bash: verify + 리다이렉션", B, "Bash", {"command": "node harness/scripts/verify.mjs G1 zz-test > x.txt"}, "judge", "deny"),
    ("judge Bash: verify && rm", B, "Bash", {"command": "node harness/scripts/verify.mjs G1 zz-test && rm -rf x"}, "judge", "deny"),
    ("메인 Bash: 승인 파일에 쓰기", B, "Bash", {"command": "echo ok > harness/runs/zz-test/approval.md"}, None, "deny"),
    ("메인 Bash: 승인 파일 읽기", B, "Bash", {"command": "cat harness/runs/zz-test/approval.md"}, None, "allow"),
    ("메인 Bash: sed -i rules.json (묻기)", B, "Bash", {"command": "sed -i '' s/a/b/ harness/rules.json"}, None, "ask"),
]
bad = 0
for name, s, t, i, a, exp in cases:
    got = run(s, t, i, a)
    bad += got != exp
    print("OK  " if got == exp else "FAIL", name, "→", got, f"(기대: {exp})")

# 승인 흐름: 사람이 approval.md를 만든 상황을 파이썬으로 흉내 낸다 (에이전트 도구가 아님)
open(f"{RUNS}/02-analysis.md", "w").write("x")
time.sleep(0.05)
open(f"{RUNS}/approval.md", "w").write("G2: approved\n")
got = run(W, "Write", {"file_path": f"{RUNS}/03-spec.md"}, "designer")
print("OK  " if got == "allow" else "FAIL", "designer → 03 (G2 승인 있음) →", got, "(기대: allow)")
bad += got != "allow"
time.sleep(0.05)
open(f"{RUNS}/02-analysis.md", "w").write("changed")
got = run(W, "Write", {"file_path": f"{RUNS}/03-spec.md"}, "designer")
print("OK  " if got == "deny" else "FAIL", "승인 뒤 02가 바뀜 → 03 쓰기 →", got, "(기대: deny)")
bad += got != "deny"

shutil.rmtree(RUNS)
print("실패:", bad)
sys.exit(1 if bad else 0)
