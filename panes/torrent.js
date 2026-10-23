// The Torrent pane: the infohash as the identity, the magnet and the metainfo and webseeds as where copies are, the trackers.
wiki.panes.push({
  name: 'torrent',
  label: 'torrent',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Torrent'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki;
    root.append(facts([['file', doc.fileName || doc.name], ['size', doc.length ? (doc.length / 1e9).toFixed(2) + ' GB' : null], ['pieces', doc.pieces], ['trackers', (doc.trackers || []).length]]));
    root.append(card([['infohash', hash(doc.infohash)], doc.contents ? ['contents', link(doc.contents['@id'])] : null].filter(Boolean)));
    const get = el('div', 'get'); if (doc.magnet) { const a = el('a', 'btn', 'open magnet'); a.href = doc.magnet; get.append(a); } if (doc.metainfo) { const a = link(doc.metainfo['@id'], '.torrent file'); a.className = 'btn ghost'; get.append(a); } for (const w of [].concat(doc.webseed || [])) { const a = link(w['@id'], 'webseed'); a.className = 'btn ghost'; get.append(a); } root.append(get);
    if (doc.trackers && doc.trackers.length) { root.append(el('h3', null, 'trackers')); const ul = el('ul'); for (const t of doc.trackers) { const li = el('li', null, t); ul.append(li); } root.append(ul); }
    for (const ev of [].concat(doc.announcedAt || [])) { const p = el('p', 'muted'); p.append('announced as a Nostr event: '); p.append(link(ev['@id'] || '', ev.id ? ev.id.slice(0, 12) + '…' : 'event')); root.append(p); }
    root.append(light('grey', 'the infohash is the claim about the bytes; a torrent client checks every piece against it as it downloads'));
  },
});
