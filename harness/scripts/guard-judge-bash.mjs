#!/usr/bin/env node
// PreToolUse 훅 (Bash): 판정자는 verify.mjs 하나만 실행할 수 있다.
// 다른 주체의 Bash도 approval.md·.retries.json·규칙 파일을 쓰는 명령은 막는다.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const cmd = (input.tool_input?.command ?? '').trim();
const agent = input.agent_id ? (input.agent_type ?? 'unknown-subagent') : null;
const deny = (msg) => { console.error(`[하네스 가드] ${msg}`); process.exit(2); };

if (agent === 'judge') {
  if (!/^node harness\/scripts\/verify\.mjs (G[1-5]|A[25]) [a-z0-9-]+$/.test(cmd)) {
    deny('판정자는 `node harness/scripts/verify.mjs <G1..G5|A2|A5> <화면-slug>` 하나만 실행할 수 있다.');
  }
  process.exit(0);
}

const writeish = />|\btee\b|\bsed\s+-\w*i|\bmv\b|\bcp\b|\brm\b|\btouch\b|\bpython3?\b|\bnode\b|\bperl\b|\bdd\b|\bln\b|\btruncate\b/;
if (writeish.test(cmd)) {
  if (/approval\.md/.test(cmd)) deny('approval.md는 사람만 작성한다.');
  if (/\.retries\.json/.test(cmd)) deny('.retries.json은 verify.mjs만 기록한다.');
  if (/harness\/rules\.json|docs\/design\.md|\.claude\/settings\.json|harness\/scripts\//.test(cmd) && !/^node harness\/scripts\/verify\.mjs /.test(cmd)) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: '[하네스 가드] 규칙·가드 파일을 바꾸는 명령이다. 사용자 승인이 필요하다.' } }));
  }
}
process.exit(0);
