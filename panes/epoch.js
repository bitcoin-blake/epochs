// The Epoch pane: the head of a SwiftSync-style epoch package: the set's muhash at both ends and what the epoch did between them.
wiki.panes.push({
  name: 'epoch',
  label: 'epoch',
  canHandle: (subject, store) => wiki.has(store.get(subject) || {}, 'Epoch'),
  render(subject, store, root, raw) {
    const doc = raw || store.get(subject);
    const { el, link, hash, facts, card, light } = wiki; const s = doc.start || {}, e = doc.end || {};
    root.append(facts([['blocks', doc.blocks && doc.blocks.count], ['transactions', doc.blocks && doc.blocks.txs], ['outputs created', doc.outputs], ['still unspent', doc.unspent], ['older coins spent', doc.spentOlder]]));
    root.append(el('h3', null, `start · height ${s.height}`)); root.append(card([['block', hash(s.hash)], ['muhash', hash(s.muhash)], ['coins', String(s.coins)]].filter((r) => r[1])));
    root.append(el('h3', null, `end · height ${e.height}`)); root.append(card([['block', hash(e.hash)], ['muhash', hash(e.muhash)], ['coins', String(e.coins)]].filter((r) => r[1])));
    if (doc.package) root.append(card([['package', doc.package['@id'] ? link(doc.package['@id']) : 'by hash'], ['sha256', hash(doc.package.sha256)], ['bytes', String(doc.package.bytes)], ['format', doc.package.format]].filter((r) => r[1])));
    root.append(light('grey', 'the two muhashes are the claim; checking it needs the package and the blocks, and is not run here'));
  },
});
