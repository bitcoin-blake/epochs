// Rebuild <chain>/index.json from the packages and torrents in that directory. No dependencies.
// usage: node tools/index.mjs txbt4   → <chain>/index.json, <chain>/<end>.html (one page per package) and index.html
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

// pages: the same facts as JSON-LD islands rendered by wiki.js, like assumeutxo.com
const SITE = 'https://bitcoin-blake.github.io/epochs/';
const NET = { txbt4: 'Bitcoin BLAKE2b testnet4', xbt: 'Bitcoin BLAKE2b mainnet' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const page = (path, title, desc, islands, depth) => {
  const up = '../'.repeat(depth); const url = SITE + (path === 'index.html' ? '' : path);
  const kind = depth ? (islands[0]['@type'] + ' · ') : ''; const og = kind + title; const d = desc.replace(/\s+/g, ' ').slice(0, 300);
  const head = `<!doctype html>\n<meta charset="utf-8"><title>${esc(title)}</title>\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<!-- ogp -->\n<meta name="description" content="${esc(d)}">\n<link rel="canonical" href="${url}">\n<meta property="og:site_name" content="epochs">\n<meta property="og:type" content="${depth ? 'article' : 'website'}">\n<meta property="og:title" content="${esc(og)}">\n<meta property="og:description" content="${esc(d)}">\n<meta property="og:url" content="${url}">\n<meta property="og:image" content="${SITE}og.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${esc(og)}">\n<meta name="twitter:description" content="${esc(d)}">\n<meta name="twitter:image" content="${SITE}og.png">\n<link rel="icon" href="${SITE}favicon.svg" type="image/svg+xml">\n<!-- /ogp -->\n`;
  const body = islands.map((d) => `<script type="application/ld+json">\n${JSON.stringify(d, null, 2)}\n</script>`).join('\n');
  writeFileSync(path, head + body + `\n<script src="${up}wiki.js"></script>\n`);
};
const CTX = 'https://bitcoin-desktop.github.io/schema/context.jsonld';
const entries = [];
for (const [i, r] of rows.entries()) {
  const name = `${chain} epoch ${r.start} → ${r.end}`;
  const desc = `${r.blocks} blocks of ${NET[chain] || chain} as a verifiable package: the UTXO set muhash at both ends, the outputs it created and which are still unspent, and the older coins it spent. The package is named by its sha256; the torrent and the hosts are where copies are.`;
  const epoch = { '@context': CTX, '@id': '#this', '@type': 'Epoch', name, description: desc, network: chain, chain: out.network,
    start: { height: r.start, hash: r.startHash, coins: r.coins.start, muhash: r.startMuhash }, end: { height: r.end, hash: r.endHash, coins: r.coins.end, muhash: r.endMuhash },
    outputs: r.outputs, unspent: r.unspent, spentOlder: r.spentOlder, blocks: { count: r.blocks, txs: r.txs },
    package: { '@id': `${r.end}.json`, sha256: r.package.sha256, bytes: r.package.bytes, format: 'blaketestnode epoch v1 (JSON-LD, one record per spent coin)' },
    ...(r.torrent ? { torrent: { '@id': '#torrent' } } : {}), ...(i ? { previous: { '@id': `${rows[i - 1].end}.html#this` } } : {}), ...(rows[i + 1] ? { next: { '@id': `${rows[i + 1].end}.html#this` } } : {}),
    built: r.built };
  const islands = [epoch];
  if (r.torrent) islands.push({ '@context': CTX, '@id': '#torrent', '@type': 'Torrent', name: `torrent of ${r.end}.json`, description: 'The package as a torrent: the infohash names the bytes, the trackers and the web seeds are where a copy was.',
    infohash: r.torrent.infohash, fileName: `${r.end}.json`, length: r.package.bytes, pieces: r.torrent.pieces, pieceLength: r.torrent.pieceLength, magnet: r.torrent.magnet,
    metainfo: { '@id': `${r.end}.json.torrent` }, webseed: r.torrent.webseeds.map((u) => ({ '@id': u })), trackers: r.torrent.trackers, contents: { '@id': '#this' } });
  page(`${chain}/${r.end}.html`, name, desc, islands, 1);
  entries.push({ '@id': `${chain}/${r.end}.html#this`, '@type': 'Epoch', name, network: chain, chain: out.network, start: r.start, end: r.end, blocks: r.blocks, txs: r.txs, outputs: r.outputs, unspent: r.unspent, spentOlder: r.spentOlder,
    sha256: r.package.sha256, bytes: r.package.bytes, endMuhash: r.endMuhash, package: { '@id': `${chain}/${r.end}.json` }, ...(r.torrent ? { magnet: r.torrent.magnet, torrent: { '@id': `${chain}/${r.end}.html#torrent` } } : {}) });
}
// the front page lists every chain's entries: other chains' index.json are read too, so one run per chain keeps the page whole
const all = []; const networks = [];
for (const c of readdirSync('.').filter((d) => { try { return statSync(`${d}/index.json`).isFile(); } catch { return false; } }).sort()) {
  networks.push({ id: c, name: NET[c] || c });
  if (c === chain) all.push(...entries); else for (const r of JSON.parse(readFileSync(`${c}/index.json`)).epochs) all.push({ '@id': `${c}/${r.end}.html#this`, '@type': 'Epoch', name: `${c} epoch ${r.start} → ${r.end}`, network: c, start: r.start, end: r.end, blocks: r.blocks, txs: r.txs, outputs: r.outputs, unspent: r.unspent, spentOlder: r.spentOlder, sha256: r.package.sha256, bytes: r.package.bytes, endMuhash: r.endMuhash, package: { '@id': `${c}/${r.end}.json` }, ...(r.torrent ? { magnet: r.torrent.magnet, torrent: { '@id': `${c}/${r.end}.html#torrent` } } : {}) });
}
page('index.html', 'epochs', 'Epoch packages for the BLAKE2b chains: one verifiable file per 2016-block epoch, with the UTXO set muhash at both ends, the outputs it created and which are still unspent, and the older coins it spent; served over HTTPS and torrents.',
  [{ '@context': CTX, '@id': '#this', '@type': 'EpochIndex', name: 'epochs', description: 'One package per 2016-block epoch of a BLAKE2b chain: the UTXO set muhash at both ends, which of the epoch\'s outputs are still unspent, and the older coins it spent. Enough to verify the epoch with no set. Consecutive packages chain, each one\'s start being the previous one\'s end; the first starts at an assumeUTXO snapshot.',
    networks, data: networks.map((n) => ({ '@id': `${n.id}/index.json` })), source: { '@id': 'https://github.com/bitcoin-blake/epochs' }, builtBy: { '@id': 'https://github.com/bitcoin-blake/blaketestnode' }, entries: all }], 0);
console.log(`${chain}/index.json + ${rows.length} pages + index.html`); for (const r of rows) console.log(` ${r.start} → ${r.end}  ${r.package.bytes} B  sha256 ${r.package.sha256.slice(0, 16)}…  infohash ${r.torrent?.infohash || '-'}`);
