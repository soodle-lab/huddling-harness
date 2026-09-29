// 사람 승인 확인. approval.md는 사람만 만든다(guard-write.mjs가 에이전트의 쓰기를 막는다).
// 형식: 줄마다 `G2: approved` 또는 `G5: approved`.
// 승인 이후에 승인 대상 파일이 바뀌었으면(mtime이 더 새로우면) 승인은 무효다.
import { existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WATCH = {
  G2: ['01-references.md', '02-analysis.md'],
  G5: ['03-spec.md', '05-screen.md', '05-figma.json'],
};

export function checkApproval(dir, gate) {
  const file = join(dir, 'approval.md');
  if (!existsSync(file)) return { ok: false, msg: 'approval.md 없음 (사람이 직접 작성해야 함)' };
  if (!new RegExp(`^${gate}:\\s*approved\\s*$`, 'm').test(readFileSync(file, 'utf8'))) {
    return { ok: false, msg: `approval.md에 "${gate}: approved" 줄이 없음` };
  }
  const at = statSync(file).mtimeMs;
  for (const f of WATCH[gate]) {
    const p = join(dir, f);
    if (existsSync(p) && statSync(p).mtimeMs > at) return { ok: false, msg: `승인 이후 ${f}가 바뀜 — 다시 승인 필요` };
  }
  return { ok: true };
}
