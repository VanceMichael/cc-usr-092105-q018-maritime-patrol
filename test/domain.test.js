import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseDomain } from '../src/domain.js';

const fixture = new URL('../fixtures/domain.json', import.meta.url);

test('样例领域资料完整', async () => {
  const value = parseDomain(await readFile(fixture, 'utf8'));
  assert.equal(value.domain, 'maritime-patrol');
  assert.ok(value.entities.length >= 3);
  assert.ok(value.rules.length >= 3);
});

test('资料覆盖双线核查的关键承诺', async () => {
  const value = parseDomain(await readFile(fixture, 'utf8'));
  for (const entity of ['统一视图', '证据快照']) {
    assert.ok(value.entities.includes(entity), `缺少领域对象：${entity}`);
  }
  const rules = value.rules.join('\n');
  assert.match(rules, /来源系统/);
  assert.match(rules, /发现时间/);
  assert.match(rules, /船舶标识/);
  assert.match(rules, /不得生成第二项现场任务/);
  assert.match(rules, /误报或无法到达/);
  assert.match(rules, /当时证据/);
  assert.match(rules, /按职责开放/);
  assert.match(rules, /统一视图为准/);
});

test('样例预警带来源、阶段与指挥状态', async () => {
  const { sample } = parseDomain(await readFile(fixture, 'utf8'));
  assert.ok(sample.alert.source_system);
  assert.ok(sample.alert.detected_at);
  assert.ok(sample.alert.vessel_identifier);
  assert.ok(sample.alert.finding);
  assert.ok(['尚未响应', '正在核查', '已经消除'].includes(sample.alert.command_state));
  assert.equal(sample.field_task.alert_id, sample.alert.alert_id);
});
