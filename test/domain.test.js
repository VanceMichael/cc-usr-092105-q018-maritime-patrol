import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDomain } from '../src/domain.js';

async function load() {
  const raw = await readFile(new URL('../fixtures/domain.json', import.meta.url), 'utf8');
  return parseDomain(raw);
}

test('样例领域资料完整', async () => {
  const value = await load();
  assert.equal(value.domain, 'maritime-patrol');
  assert.ok(value.entities.length >= 3);
  assert.ok(value.rules.length >= 3);
});

test('四套来源系统与七类证据汇入统一视图', async () => {
  const { sample } = await load();
  assert.deepEqual(sample.unified_view.sources, ['智慧海事', 'CCTV', 'VTS', '智慧运河平台']);
  for (const key of ['vessel', 'crew', 'cargo', 'waterway', 'hydro_meteo', 'video']) {
    assert.ok(sample.unified_view[key], `统一视图缺少 ${key}`);
  }
});

test('预警携带来源系统、发现时间、船舶标识与事件内容', async () => {
  const { sample } = await load();
  const alert = sample.alert;
  assert.ok(alert.source_system);
  assert.ok(alert.detected_at);
  assert.ok(alert.vessel_key.mmsi);
  assert.ok(alert.event);
  assert.equal(sample.traceability.found_by, '电子组');
});

test('指挥端只呈现三种统一状态', async () => {
  const { sample } = await load();
  assert.ok(['尚未响应', '正在核查', '已经消除'].includes(sample.alert.command_status));
});

test('一项预警只对应一项任务，返航补传不重复建单', async () => {
  const { sample, rules } = await load();
  assert.equal(sample.task.alert_id, sample.alert.alert_id);
  assert.equal(sample.task.offline_backfill.duplicate_task_created, false);
  assert.ok(rules.some((r) => r.includes('返航补传不得重复建单')));
});

test('抢单只确认一个认领人，其余记录保留但不生效', async () => {
  const { sample } = await load();
  const { claim } = sample.task;
  assert.ok(claim.accepted_by);
  for (const rejected of claim.rejected_claims) {
    assert.equal(rejected.kept_but_inactive, true);
  }
});

test('证据快照不可变，且覆盖预警升级场景', async () => {
  const { sample } = await load();
  assert.ok(sample.evidence_snapshots.length >= 2);
  for (const snap of sample.evidence_snapshots) {
    assert.equal(snap.immutable, true);
  }
  const upgrade = sample.alert.upgrade_history[0];
  assert.ok(sample.evidence_snapshots.some((s) => s.snapshot_id === upgrade.evidence_snapshot_id));
});

test('误报或无法到达必须记录原因', async () => {
  const { sample, rules } = await load();
  assert.ok(sample.task.closure.manner.includes('误报'));
  assert.ok(sample.task.closure.manner.includes('无法到达'));
  assert.equal(sample.task.closure.reason_required_when_not_resolved, true);
  assert.ok(rules.some((r) => r.includes('记录原因')));
});
