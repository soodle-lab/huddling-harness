#!/usr/bin/env node
// 사용: node harness/scripts/verify.mjs <G1..G5|A2|A5> <화면-slug> [runs 폴더] [--no-count]
// G1~G5: 기계가 셀 수 있는 조건. A2·A5: 사람 승인(approval.md) 확인.
// 실패한 게이트는 .retries.json에 횟수를 적고, 재시도 한도(rules.json maxRetries)를 넘기면 halt=true.
// 출력: {"gate","slug","pass","failures","attempts?","halt?"}  종료코드: 통과 0, 실패 1, 사용 오류 2, 한도 초과(멈춤) 3
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { checkApproval } from './approval.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rules = JSON.parse(readFileSync(join(here, '..', 'rules.json'), 'utf8'));
const args = process.argv.slice(2);
const noCount = args.includes('--no-count');
const [gate, slug, runsArg] = args.filter((a) => !a.startsWith('--'));
const runsDir = runsArg ?? join(here, '..', 'runs');
if (!/^(G[1-5]|A[25])$/.test(gate ?? '') || !slug || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('usage: verify.mjs <G1..G5|A2|A5> <slug> [runsDir] [--no-count]');
  process.exit(2);
}
const dir = join(runsDir, slug);
const failures = [];
const fail = (id, msg) => failures.push({ id, msg });
const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null);

// 스타일 노드 JSON 검사 (G4: 설계서 안의 style-nodes 블록, G5: 05-figma.json). D1~D4 + S1.
function checkStyle(data, where) {
  const nodes = data.nodes ?? [];
  const D = rules.design;
  for (const n of nodes) {
    const label = `${where}:${n.name ?? '?'}`;
    if (n.cornerRadius !== undefined) {
      const isIcon = n.type === 'icon' && n.cornerRadiusPercent === D.D1.iconRadiusPercent;
      if (!isIcon && !D.D1.allowedRadius.includes(n.cornerRadius)) fail('D1', `${label} radius=${n.cornerRadius}`);
    }
    if (n.fontFamily !== undefined && n.fontFamily !== D.D3.fontFamily) fail('D3', `${label} font=${n.fontFamily}`);
    if (n.fontWeight !== undefined && !D.D3.allowedWeights.includes(n.fontWeight)) fail('D3', `${label} weight=${n.fontWeight}`);
  }
  const shadows = nodes.filter((n) => (n.shadows ?? 0) > 0);
  const exception = shadows.filter((n) => n.role === D.D2.exceptionRole);
  const bad = shadows.filter((n) => n.role !== D.D2.exceptionRole);
  bad.forEach((n) => fail('D2', `${where}:${n.name} shadows=${n.shadows}`));
  if (exception.length > D.D2.exceptionMax) fail('D2', `${where} 예외 그림자 ${exception.length}개 (최대 ${D.D2.exceptionMax})`);
  const accent = nodes.filter((n) => (n.fills ?? []).some((c) => String(c).toLowerCase() === D.D4.accent));
  if (accent.length > D.D4.maxCount) fail('D4', `${where} 액센트 ${accent.length}개 (최대 ${D.D4.maxCount})`);
  accent.filter((n) => !D.D4.allowedRoles.includes(n.role)).forEach((n) => fail('D4', `${where}:${n.name} role=${n.role ?? '없음'}는 상업 신호가 아님`));
  const sale = data.saleRequest;
  if (sale?.present && !sale.sellerOnly) fail('S1', `${where} 판매 신청 선택지에 seller 전용 표시가 없음`);
}

const fm = (text, key) => new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(text ?? '')?.[1]?.trim();
const gates = {
  G1() {
    const t = read('01-references.md');
    if (t === null) return fail('G1', '01-references.md 없음');
    const refs = [...t.matchAll(/^- (R\d+):.*?(https?:\/\/[^\s)]*uibowl[^\s)]*)/gm)];
    const ids = new Set(refs.map((m) => m[1]));
    if (ids.size < rules.minReferences) fail('G1', `uibowl URL이 있는 레퍼런스 ${ids.size}건 (최소 ${rules.minReferences})`);
  },
  G2() {
    const refs = read('01-references.md');
    const t = read('02-analysis.md');
    if (t === null) return fail('G2', '02-analysis.md 없음');
    const ids = new Set([...(refs ?? '').matchAll(/^- (R\d+):/gm)].map((m) => m[1]));
    const items = [...t.matchAll(/^- (A\d+):.*$/gm)];
    if (items.length < 1) fail('G2', '"가져올 것" 항목(- A1: ...)이 없음');
    for (const it of items) {
      const cited = /근거:\s*([^)\n]+)/.exec(it[0])?.[1].split(/[,\s]+/).filter(Boolean) ?? [];
      if (!cited.length) fail('G2', `${it[1]} 근거 번호 없음`);
      cited.filter((c) => !ids.has(c)).forEach((c) => fail('G2', `${it[1]} 근거 ${c}가 01 목록에 없음`));
    }
    // 사람 승인은 별도: approval.md (사람만 작성)
  },
  G3() {
    const t = read('03-spec.md');
    if (t === null) return fail('G3', '03-spec.md 없음');
    if (!rules.screens.includes(slug)) fail('G3', `화면 ${slug}는 PRD 16장 핵심 화면 10개에 없음`);
    for (const s of rules.specSections) if (!new RegExp(`^##\\s*${s}\\s*$`, 'm').test(t)) fail('G3', `필수 섹션 "${s}" 없음`);
  },
  G4() {
    const t = read('03-spec.md');
    if (t === null) return fail('G4', '03-spec.md 없음');
    const block = /```style-nodes\s*([\s\S]*?)```/.exec(t)?.[1];
    if (!block) return fail('G4', '설계서에 ```style-nodes``` JSON 블록이 없음');
    let data;
    try { data = JSON.parse(block); } catch (e) { return fail('G4', `style-nodes JSON 오류: ${e.message}`); }
    checkStyle(data, '03-spec');
  },
  G5() {
    const t = read('05-figma.json');
    if (t === null) return fail('G5', '05-figma.json 없음 (판정자가 Figma에서 읽어 온 값을 오케스트레이터가 저장)');
    let data;
    try { data = JSON.parse(t); } catch (e) { return fail('G5', `JSON 오류: ${e.message}`); }
    const frames = data.frames ?? [];
    if (frames.length !== 1) fail('G5', `프레임 ${frames.length}개 (1개여야 함)`);
    else if (frames[0].width !== rules.frame.width || frames[0].height !== rules.frame.height) fail('G5', `프레임 ${frames[0].width}×${frames[0].height} (${rules.frame.width}×${rules.frame.height}여야 함)`);
    checkStyle(data, '05-figma');
    // 사람 승인은 별도: approval.md (사람만 작성)
  },
};
gates.A2 = () => { const r = checkApproval(dir, 'G2'); if (!r.ok) fail('A2', r.msg); };
gates.A5 = () => { const r = checkApproval(dir, 'G5'); if (!r.ok) fail('A5', r.msg); };
gates[gate]();
const pass = failures.length === 0;
const out = { gate, slug, pass, failures };
let code = pass ? 0 : 1;
if (!noCount && gate.startsWith('G')) {
  const cf = join(dir, '.retries.json');
  let counts = {};
  try { counts = JSON.parse(readFileSync(cf, 'utf8')); } catch {}
  if (pass) delete counts[gate]; else counts[gate] = (counts[gate] ?? 0) + 1;
  if (!pass) {
    out.attempts = counts[gate];
    if (counts[gate] > rules.maxRetries) { out.halt = true; code = 3; }
  }
  if (existsSync(dir)) writeFileSync(cf, JSON.stringify(counts));
}
console.log(JSON.stringify(out, null, 2));
process.exit(code);
