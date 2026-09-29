import {expect, it} from 'vitest';
import {UploadCapacity} from './upload-capacity.js';
const MiB = 1024 * 1024;
it.each([[79, true], [80, true], [89, true], [90, false]])('handles %i percent used', async (used, accepted) => {
  const capacity = new UploadCapacity('unused', async () => ({blocks: 100_000, bavail: (100 - Number(used)) * 1000, bsize: MiB}));
  if (accepted) (await capacity.acquire(200 * MiB))();
  else await expect(capacity.acquire(200 * MiB)).rejects.toMatchObject({statusCode: 507});
});
it('reserves concurrent requests atomically and releases idempotently', async () => {
  const capacity = new UploadCapacity('unused', async () => ({blocks: 1000, bavail: 520, bsize: MiB}));
  const results = await Promise.allSettled([capacity.acquire(200 * MiB), capacity.acquire(200 * MiB)]);
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  for (const r of results) if (r.status === 'fulfilled') { r.value(); r.value(); }
  const release = await capacity.acquire(200 * MiB);
  await expect(capacity.acquire(200 * MiB)).rejects.toThrow(); release();
});
it.each([0, NaN, Infinity, -1])('fails closed with invalid total %s', async blocks => {
  await expect(new UploadCapacity('unused', async () => ({blocks, bavail: 100, bsize: MiB})).acquire(MiB)).rejects.toThrow();
});
it('fails closed on inaccessible filesystem statistics', async () => {
  await expect(new UploadCapacity('unused', async () => { throw new Error('private path'); }).acquire(MiB))
    .rejects.toMatchObject({code: 'INSUFFICIENT_STORAGE'});
});
