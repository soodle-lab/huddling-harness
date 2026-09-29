#!/usr/bin/env node
// PreToolUse 훅 (Write|Edit|MultiEdit|NotebookEdit): 어기면 막는 장치.
// 막으면 종료코드 2 + stderr 사유, 사용자에게 묻게 하려면 ask JSON을 낸다.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkApproval } from './approval.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const input = JSON.parse(readFileSync(0, 'utf8'));
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);

const abs = resolve(input.cwd ?? root, target);
const rel = relative(root, abs).split(sep).join('/');
if (rel.startsWith('..')) process.exit(0); // 프로젝트 밖은 관여하지 않는다

const agent = input.agent_id ? (input.agent_type ?? 'unknown-subagent') : null; // null = 메인 세션(오케스트레이터)
const deny = (msg) => { console.error(`[하네스 가드] ${msg}`); process.exit(2); };
const ask = (msg) => {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: `[하네스 가드] ${msg}` } }));
  process.exit(0);
};

// 1. 사람만 쓰는 파일, 스크립트만 쓰는 파일
if (/^harness\/runs\/[^/]+\/approval\.md$/.test(rel)) deny('approval.md는 사람만 작성한다. 에이전트는 쓸 수 없다.');
if (/^harness\/runs\/[^/]+\/\.retries\.json$/.test(rel)) deny('.retries.json은 verify.mjs만 기록한다.');

// 2. 규칙·기준·가드 파일: 서브에이전트는 금지, 메인은 사용자에게 묻는다
const protectedFile = rel === 'harness/rules.json' || rel === 'docs/design.md' || rel === '.claude/settings.json' || /^harness\/scripts\/[^/]+\.mjs$/.test(rel);
if (protectedFile) {
  if (agent) deny(`${rel}은 서브에이전트가 수정할 수 없다.`);
  ask(`${rel}은 규칙 파일이다. 사용자가 승인해야만 수정한다.`);
}

// 3. 에이전트별 편집 허용 목록
const ALLOW = {
  researcher: ['01-references.md', '02-analysis.md'],
  designer: ['03-spec.md', '05-screen.md'],
  judge: [],
};
const m = /^harness\/runs\/([^/]+)\/([^/]+)$/.exec(rel);
if (agent && agent in ALLOW) {
  if (!m || !ALLOW[agent].includes(m[2])) deny(`${agent}는 ${ALLOW[agent].length ? ALLOW[agent].map((f) => 'runs/<화면>/' + f).join(', ') : '어떤 파일도'} 만 편집할 수 있다. (요청: ${rel})`);
}

// 4. 사람 승인(G2) 없이 설계서(03) 작성 금지
if (m && m[2] === '03-spec.md') {
  const r = checkApproval(join(root, 'harness', 'runs', m[1]), 'G2');
  if (!r.ok) deny(`S3 설계는 G2 사람 승인 후에만 시작한다: ${r.msg}`);
}
process.exit(0);
