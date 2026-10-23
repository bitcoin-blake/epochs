// Rebuild <chain>/index.json from the packages and torrents in that directory. No dependencies.
// usage: node tools/index.mjs txbt4
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const chain = process.argv[2]; if (!chain) throw new Error('usage: node tools/index.mjs <chain dir>');
// bencode: decode and keep the byte range of every value, so the info dict can be hashed as written
function bdecode(buf, i = 0) {
  const c = buf[i];
  if (c === 0x69) { const e = buf.indexOf(0x65, i); return [Number(buf.toString('latin1', i + 1, e)), e + 1]; }
  if (c === 0x6c) { const a = []; i++; while (buf[i] !== 0x65) { const [v, n] = bdecode(buf, i); a.push(v); i = n; } return [a, i + 1]; }
  if (c === 0x64) { const o = {}; i++; while (buf[i] !== 0x65) { const [k, n] = bdecode(buf, i); const s = n; const [v, m] = bdecode(buf, n); o[k] = v; if (k === 'info') o.__info = buf.subarray(s, m); i = m; } return [o, i + 1]; }
  const colon = buf.indexOf(0x3a, i); const len = Number(buf.toString('latin1', i, colon)); const s = colon + 1;
  return [buf.toString('latin1', s, s + len), s + len];
}
const trackers = (t) => (t['announce-list'] || [[t.announce]]).flat();
const rows = [];
for (const f of readdirSync(chain).filter((f) => /^\d+\.json$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b))) {
  const path = `${chain}/${f}`; const bytes = readFileSync(path); const e = JSON.parse(bytes);
  const row = {
    end: e.end.height, start: e.start.height, blocks: e.blocks.count, txs: e.blocks.txs,
    startHash: e.start.hash, endHash: e.end.hash, startMuhash: e.start.muhash, endMuhash: e.end.muhash,
    coins: { start: e.start.coins, end: e.end.coins }, outputs: e.outputs, unspent: e.unspent, spentOlder: e.spent.length,
    package: { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }, built: e.built,
  };
  try {
    const tb = readFileSync(path + '.torrent'); const [t] = bdecode(tb);
    const infohash = createHash('sha1').update(t.__info).digest('hex');
    const tr = trackers(t).map((a) => '&tr=' + encodeURIComponent(a)).join(''); const ws = (t['url-list'] || []).map((u) => '&ws=' + encodeURIComponent(u)).join('');
    row.torrent = { path: path + '.torrent', infohash, pieceLength: t.info['piece length'], pieces: t.info.pieces.length / 20, webseeds: t['url-list'] || [], trackers: trackers(t), magnet: `magnet:?xt=urn:btih:${infohash}&dn=${encodeURIComponent(t.info.name)}${tr}${ws}` };
  } catch {}
  rows.push(row);
}
const out = { chain, network: rows[0] && JSON.parse(readFileSync(rows[0].package.path)).chain, epochs: rows, updated: new Date().toISOString() };
writeFileSync(`${chain}/index.json`, JSON.stringify(out, null, 2) + '\n');
console.log(`${chain}/index.json: ${rows.length} epochs`); for (const r of rows) console.log(` ${r.start} → ${r.end}  ${r.package.bytes} B  sha256 ${r.package.sha256.slice(0, 16)}…  infohash ${r.torrent?.infohash || '-'}`);
