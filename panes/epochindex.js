// The EpochIndex pane: every epoch package as one row, grouped by chain: heights, what the epoch did, the package's sha256, the end muhash, and the ways to get it.
wiki.panes.push({
  label: 'table', icon: '',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'EpochIndex'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject); const { el, link } = wiki;
    const epochs = [].concat(doc.entries || []).filter((e) => wiki.has(e, 'Epoch'));
    const nets = [].concat(doc.networks || []); const ORDER = nets.map((n) => n.id); const NAMES = Object.fromEntries(nets.map((n) => [n.id, n.name]));
    const n = (x) => x != null ? Number(x).toLocaleString('en-US') : '?';
    const t = el('table', 'dt'); const head = el('tr'); for (const h of ['epoch', 'blocks', 'txs', 'outputs', 'unspent', 'spent older', 'package', 'end muhash', 'get it']) head.append(el('th', null, h)); t.append(head);
    const groups = new Map(); for (const e of epochs) { const k = e.network || '?'; (groups.get(k) || groups.set(k, []).get(k)).push(e); }
    const keys = [...groups.keys()].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    for (const k of keys) {
      const gh = el('tr', 'grp net-' + k); const gc = el('td'); gc.colSpan = 9; gc.append(el('span', 'type', k), ' ', NAMES[k] || groups.get(k)[0].chain || ''); gh.append(gc); t.append(gh);
      for (const e of groups.get(k).sort((a, b) => (b.end || 0) - (a.end || 0))) {
        const tr = el('tr', 'net-' + k);
        const c = el('td'); c.style.whiteSpace = 'nowrap'; c.append(link(e['@id'], `${n(e.start)} → ${n(e.end)}`)); tr.append(c);
        for (const v of [e.blocks, e.txs, e.outputs, e.unspent, e.spentOlder]) tr.append(el('td', 'num', n(v)));
        const pc = el('td', 'num'); if (e.sha256) { const a = link(e['@id'], e.sha256.slice(0, 12) + '…'); a.title = 'sha256 ' + e.sha256; pc.append(a); pc.append(el('div', 'muted', e.bytes != null ? (e.bytes / 1024).toFixed(0) + ' KB' : '')); } else pc.append('?'); tr.append(pc);
        const mc = el('td', 'num'); if (e.endMuhash) { const s = el('span', null, e.endMuhash.slice(0, 12) + '…'); s.title = 'muhash ' + e.endMuhash; mc.append(s); } else mc.append('?'); tr.append(mc);
        const g = el('td', 'get'); const chip = (a, cls) => { a.className = 'chip ' + (cls || ''); g.append(a); };
        if (e.magnet) { const a = el('a', null, 'magnet'); a.href = e.magnet; chip(a, 'primary'); } if (e.torrent) chip(link(e.torrent['@id'], 'torrent')); if (e.package) chip(link(e.package['@id'], 'https')); tr.append(g);
        t.append(tr);
      }
    }
    root.append(t);
    root.append(el('p', 'muted', 'An epoch is named by the muhash of the UTXO set at its two ends; the package is proven by its sha256 and infohash; the hosts are only where a copy was.'));
  },
});
