// wiki.js: the generic view of a data wiki page. A page is HTML whose truth is its JSON-LD islands
// (<script type="application/ld+json">). This renders every island as an outline: the @type as a heading,
// properties as rows, nested objects as nested tables, anything with an @id as a link resolved against the
// page, the raw JSON underneath. No build, no router, no state: a link loads the next page, which carries
// its own island and its own copy of this file. A page with a richer renderer can add it; this is the floor.
(() => {
  const CSS = `
    :root{--paper:#faf8f3;--card:#ffffff;--ink:#17160f;--ink2:#3d3a33;--mute:#78736a;--line:#e9e4d9;--line2:#d9d2c3;--accent:#c47a12;--accent2:#fff4e3;--link:#1f4e8c;--ok:#2f9e5b;--bad:#cc3d2e;--grey:#c9c3b6;
      --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;--sans:system-ui,-apple-system,"Segoe UI",Inter,Roboto,sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace}
    *{box-sizing:border-box}
    html{background:var(--paper)}
    body{margin:0;font:16px/1.55 var(--sans);color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased}
    main.wiki{max-width:1080px;margin:0 auto;padding:0 20px 96px}
    .wiki section > .eyebrow,.wiki section > h1,.wiki section > h2,.wiki section > .id,.wiki section > p.lede{max-width:860px}
    .wiki nav{display:flex;align-items:center;gap:22px;height:56px;margin:0 0 40px;border-bottom:1px solid var(--line);font-size:13px;letter-spacing:.02em}
    .wiki nav a{color:var(--mute);text-decoration:none}.wiki nav a:hover{color:var(--ink)}
    .wiki nav a.wordmark{color:var(--ink);font:600 15px var(--serif);letter-spacing:0;margin-right:auto}
    .wiki nav a.wordmark::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--accent);margin-right:9px;vertical-align:1px}
    .wiki section{margin:0 0 56px}
    .wiki .eyebrow{display:flex;gap:8px;align-items:center;margin:0 0 10px}
    .wiki h1{font:400 44px/1.1 var(--serif);letter-spacing:-.015em;margin:0 0 10px;color:var(--ink)}
    .wiki h2{font:400 28px/1.15 var(--serif);letter-spacing:-.01em;margin:0 0 10px}
    .wiki .id{display:flex;align-items:center;gap:8px;font:12.5px var(--mono);color:var(--mute);word-break:break-all;margin:0 0 14px}
    .wiki .id a{color:var(--mute)}
    .wiki p.lede{font:19px/1.5 var(--serif);color:var(--ink2);margin:0 0 26px;max-width:62ch}
    .wiki .type{display:inline-block;font:500 11px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--accent);background:var(--accent2);border:1px solid #f1dcb9;border-radius:999px;padding:5px 9px 4px}
    .wiki a{color:var(--link);text-decoration:none}.wiki a:hover{text-decoration:underline;text-underline-offset:3px}
    .wiki .tabs{display:inline-flex;gap:2px;padding:3px;background:#efeae0;border-radius:10px;margin:0 0 18px}
    .wiki .tabs button{font:500 13px var(--sans);background:none;border:0;border-radius:8px;padding:6px 14px;color:var(--mute);cursor:pointer}
    .wiki .tabs button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.08),0 0 0 1px var(--line)}
    .wiki .tabs button:hover:not(.on){color:var(--ink)}
    .wiki table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
    .wiki td{vertical-align:top;padding:11px 16px;border-top:1px solid var(--line);font-size:14px;line-height:1.5}
    .wiki tr:first-child td{border-top:0}
    .wiki td.k{width:12.5em;color:var(--mute);font:500 12px/1.6 var(--mono);letter-spacing:.03em;white-space:nowrap;background:#fcfbf8}
    .wiki td.v{font:13.5px/1.55 var(--mono);color:var(--ink2);word-break:break-all}
    .wiki td.v table{margin:2px 0;border-radius:8px}.wiki td.v td{padding:7px 12px;font-size:13px}.wiki td.v td.k{width:10em}
    .wiki ul{margin:0;padding-left:0;list-style:none}.wiki li{margin:0 0 6px;padding-left:14px;position:relative}
    .wiki li::before{content:"";position:absolute;left:0;top:.6em;width:5px;height:5px;border-radius:50%;background:var(--line2)}
    .wiki .num{font-variant-numeric:tabular-nums;color:var(--ink)}
    .wiki .hash{font:13px var(--mono);color:var(--ink2)}
    .wiki button.copy{font:11px var(--mono);border:1px solid var(--line2);background:var(--card);color:var(--mute);border-radius:6px;padding:2px 7px;margin-left:8px;cursor:pointer;vertical-align:middle}
    .wiki button.copy:hover{color:var(--ink);border-color:#bbb}
    .wiki pre{background:var(--card);border:1px solid var(--line);padding:16px 18px;border-radius:12px;overflow:auto;font:12.5px/1.5 var(--mono);color:var(--ink2);margin:0}
    .wiki .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin:0 0 20px}
    .wiki .card{display:block;border:1px solid var(--line);border-radius:14px;padding:18px 20px 20px;background:var(--card);color:inherit;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
    .wiki .card:hover{text-decoration:none;transform:translateY(-2px);border-color:var(--line2);box-shadow:0 10px 30px -18px rgba(23,22,15,.35)}
    .wiki .card b{display:block;font:400 21px/1.25 var(--serif);letter-spacing:-.01em;margin:12px 0 6px;color:var(--ink)}
    .wiki .card .muted{display:block}
    .wiki .muted{color:var(--mute);font-size:13.5px}
    .wiki .err{color:var(--bad)}
    .wiki .marks{position:relative;margin:4px 0 0;padding-left:26px}
    .wiki .marks::before{content:"";position:absolute;left:8px;top:14px;bottom:14px;width:2px;background:var(--line)}
    .wiki .mark{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin:0 0 14px;font-size:14px}
    .wiki .mark::before{content:"";position:absolute;left:-23px;top:20px;width:12px;height:12px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px var(--paper)}
    .wiki .mark > div:first-child{font:400 17px var(--serif);margin:0 0 10px;color:var(--ink)}
    .wiki .mark > div:first-child a{font:13px var(--mono)}
    .wiki .mark div{margin:4px 0;color:var(--ink2)}
    .wiki .lit{margin:4px 0;color:var(--ink2);font-size:14px}
    .wiki .light{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:10px;vertical-align:1px;background:var(--grey)}
    .wiki .light.ok{background:var(--ok);box-shadow:0 0 0 3px #e3f3e9}.wiki .light.bad{background:var(--bad);box-shadow:0 0 0 3px #f9e1de}.wiki .light.grey{background:var(--grey);box-shadow:0 0 0 3px #f0ece3}
    .wiki .view > p.muted{margin:14px 0 0}
    .wiki table.dt{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden;border-collapse:separate;border-spacing:0;width:100%}
    .wiki table.dt th{font:500 11px/1.6 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);text-align:left;padding:10px 14px;background:#fcfbf8;border-bottom:1px solid var(--line)}
    .wiki table.dt td{font:14px/1.45 var(--sans);padding:12px 14px;border-top:1px solid var(--line);vertical-align:top;color:var(--ink2)}
    .wiki table.dt td.num{font-family:var(--mono);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
    .wiki table.dt tr:first-child td{border-top:0}.wiki table.dt .muted{font-size:12px}
    .wiki ul.more{margin:14px 0 0}.wiki ul.more li{margin:6px 0}
    .wiki p.status{margin:-8px 0 26px;max-width:860px;border-left:3px solid var(--accent);padding:8px 16px;background:var(--accent2);border-radius:0 8px 8px 0;color:var(--ink2);font-size:14.5px;line-height:1.5}
    .wiki p.prose{max-width:66ch;font-size:16px;line-height:1.6;color:var(--ink2);margin:0 0 6px}
    .wiki ol.steps{max-width:66ch;padding-left:22px;margin:0 0 6px;list-style:decimal}.wiki ol.steps li::before{content:none}.wiki ol.steps li{margin:0 0 12px}.wiki ol.steps li p.prose{margin:0 0 4px}
    .wiki pre.code{max-width:66ch;font:14px/1.5 var(--mono, ui-monospace, monospace);background:#f3efe6;border:1px solid #e6dfd2;border-radius:6px;padding:10px 12px;margin:4px 0 8px;white-space:pre-wrap;word-break:break-all}
    .wiki ul.links li{margin:0 0 10px}.wiki ul.links li a{font-size:15px}.wiki ul.links li div.muted{margin-top:1px}
    .wiki table.dt tr.grp td{background:#f6f3ec;font:500 13px var(--sans);color:var(--ink);padding:9px 14px;border-top:1px solid var(--line2)}
    .wiki table.dt tr.grp .type{margin-right:4px}
    .wiki table.dt td:first-child{border-left:4px solid var(--stripe,transparent);padding-left:12px}
    .wiki table.dt td.src{max-width:16em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mute);font-size:13px}
    .wiki table.dt td.get{font-size:12.5px;min-width:22em;white-space:nowrap}
    .wiki table.dt td.get .chip{display:inline-block;margin:0 6px 6px 0;padding:3px 9px;border-radius:999px;border:1px solid var(--line2);background:var(--card);color:var(--ink2);font:500 12px var(--sans);text-decoration:none}
    .wiki table.dt td.get a.chip:hover{border-color:var(--ink);color:var(--ink)}
    .wiki table.dt td.get .chip.primary{background:var(--ink);color:#fff;border-color:var(--ink)}.wiki table.dt td.get .chip.primary:hover{background:#2a2820}
    .wiki table.dt td.get .chip.plain{color:var(--mute);background:#f6f3ec;border-color:transparent}
    .wiki table.dt td.att{white-space:nowrap}
    .wiki .pill{display:inline-block;margin:0 6px 4px 0;padding:2px 9px;border-radius:999px;font:12px var(--sans);color:var(--mute);background:#f3f0e8;border:1px solid var(--line)}
    .wiki .pill b{font-weight:600;color:inherit}
    .wiki .pill.formal.on{color:#1f6b3f;background:#e3f3e9;border-color:#bfe3cc}.wiki .pill.informal.on{color:#8a5a00;background:#fbefd6;border-color:#f1dcb9}
    .wiki table.dt td.src{max-width:18em;white-space:normal}
    .wiki table.dt td.src .clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.35}
    .wiki table.dt td:first-child a{font:500 15px var(--sans)}
    .wiki tr.net-btc{--stripe:#e0a93a}.wiki tr.net-xbt{--stripe:#c47a12}.wiki tr.net-tbtc4{--stripe:#5aa87a}.wiki tr.net-txbt4{--stripe:#2f9e5b}.wiki tr.net-tbtc3{--stripe:#8c9bb0}.wiki tr.net-signet{--stripe:#9b7ad1}
    .wiki tr.grp.net-btc .type{color:#8a5a00;background:#fbefd6;border-color:#f1dcb9}.wiki tr.grp.net-xbt .type{color:#8a4a00;background:#fde9d2;border-color:#f3cfa7}
    .wiki tr.grp.net-tbtc4 .type,.wiki tr.grp.net-txbt4 .type{color:#1f6b3f;background:#e3f3e9;border-color:#bfe3cc}
    .wiki tr.grp.net-tbtc3 .type{color:#3f5068;background:#e8edf3;border-color:#cdd6e1}.wiki tr.grp.net-signet .type{color:#5a3d8a;background:#eee8f8;border-color:#d7c9ef}
    .wiki .facts{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 16px}
    .wiki .fact{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;min-width:120px}
    .wiki .fk{display:block;font:500 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin:0 0 4px}
    .wiki .fv{display:block;font:400 22px/1.1 var(--serif);color:var(--ink);font-variant-numeric:tabular-nums}
    .wiki .idcard,.wiki .profile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 0;margin:0 0 16px}
    .wiki .prow{display:flex;gap:14px;padding:10px 16px;border-top:1px solid var(--line);align-items:baseline}
    .wiki .prow:first-child{border-top:0}
    .wiki .pk{flex:0 0 12.5em;font:500 12px/1.6 var(--mono);letter-spacing:.03em;color:var(--mute)}
    .wiki .pv{font:13.5px/1.55 var(--mono);color:var(--ink2);word-break:break-all;min-width:0}
    .wiki .pv code{font:inherit;background:#f3f0e8;padding:1px 6px;border-radius:5px}
    .wiki .get{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px}
    .wiki .btn{display:inline-block;font:500 14px var(--sans);background:var(--ink);color:#fff;border-radius:10px;padding:10px 18px;border:1px solid var(--ink)}
    .wiki .btn:hover{text-decoration:none;background:#2a2820}
    .wiki .btn.ghost{background:var(--card);color:var(--ink);border-color:var(--line2)}.wiki .btn.ghost:hover{border-color:var(--ink)}
    .wiki h3{font:400 20px var(--serif);margin:18px 0 8px}
    @media (max-width:640px){.wiki .prow{flex-direction:column;gap:2px}.wiki .pk{flex:none}}
    .wiki footer.foot{margin-top:72px;padding-top:14px;border-top:1px solid var(--line);font:12px var(--mono);letter-spacing:.04em}
    .wiki footer.foot a{color:var(--mute)}.wiki footer.foot a:hover{color:var(--ink)}
    @media (max-width:640px){.wiki h1{font-size:34px}.wiki td.k{width:9em;font-size:11px}.wiki td{padding:9px 12px}main.wiki{padding:0 14px 72px}}
  `;
  const isIri = (s) => /^(https?:|magnet:|did:|txo:|urn:|mailto:|wss?:|\.{0,2}\/|[\w.-]+\.(html|jsonld|json|torrent|dat)(#|$)|#)/i.test(s);
  const href = (iri) => { try { return /^(https?:|\.{0,2}\/|[\w./-]+\.html|#)/i.test(iri) ? new URL(iri, location.href).href : iri; } catch { return iri; } };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const link = (iri, text) => { const a = el('a', null, text ?? iri); a.href = href(iri); return a; };
  // a long hex value: the first and last characters emphasised so two hashes can be told apart at a glance, and a copy button
  // a long hex value, plain, with a copy button
  const hash = (h) => { const s = el('span', 'hash'); s.append(h); const b = el('button', 'copy', 'copy'); b.onclick = (e) => { e.preventDefault(); navigator.clipboard.writeText(h).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); }; s.append(b); return s; };

  function value(v) {
    if (v == null) return el('span', null, '—');
    if (Array.isArray(v)) { const ul = el('ul'); for (const x of v) { const li = el('li'); li.append(value(x)); ul.append(li); } return ul; }
    if (typeof v === 'object') {
      const keys = Object.keys(v);
      if (keys.length === 1 && v['@id']) return link(v['@id']);
      return table(v);
    }
    if (typeof v === 'string' && isIri(v)) return link(v);
    if (typeof v === 'string' && /^[0-9a-f]{40,}$/i.test(v)) return hash(v);
    if (typeof v === 'number') return el('span', 'num', v.toLocaleString('en-US'));
    return el('span', null, String(v));
  }
  function table(obj) {
    const t = el('table');
    for (const [k, v] of Object.entries(obj)) {
      if (k === '@context') continue;
      const tr = el('tr'); const kd = el('td', 'k', k); const vd = el('td', 'v');
      if (k === '@type') vd.append(...[].concat(v).map((x) => el('span', 'type', x)));
      else if (k === '@id') vd.append(link(v));
      else vd.append(value(v));
      tr.append(kd, vd); t.append(tr);
    }
    return t;
  }
  async function island(doc, i) {
    const sec = el('section');
    const id = doc['@id']; if (id && id.startsWith('#')) sec.id = id.slice(1);
    const eyebrow = el('div', 'eyebrow'); eyebrow.append(...[].concat(doc['@type'] || []).map((x) => el('span', 'type', x))); sec.append(eyebrow);
    sec.append(el(i ? 'h2' : 'h1', null, doc.name || doc.title || (id ? id : 'document')));
    if (id) { const full = new URL(id, location.href).href; const line = el('div', 'id'); line.append(link(full, full)); const b = el('button', 'copy', 'copy'); b.onclick = () => navigator.clipboard.writeText(full).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); line.append(b); sec.append(line); }
    if (doc.description) sec.append(el('p', 'lede', doc.description));
    if (doc.status) { const st = el('p', 'status'); for (const part of [].concat(doc.status)) st.append(typeof part === 'string' ? part : link(part['@id'], part.name || part['@id'])); if (doc.statusLink) { st.append(' '); st.append(link(doc.statusLink['@id'], '→ ' + (doc.statusLink.name || doc.statusLink['@id']))); } sec.append(st); } // the state of the thing, part of the hero, above any view; a string, or parts: strings and links
    await tabs(doc, sec);
    return sec;
  }
  // the wiki's root is where this file lives, so pages in subfolders get the same nav
  const ROOT = (document.currentScript && document.currentScript.src) ? new URL('.', document.currentScript.src).href : new URL('.', location.href).href;
  // Panes, LOSOS's contract (https://losos.org/): a pane is { label, icon?, canHandle(subject, store) -> bool,
  // render(subject, store, container, rawData) }. The subject is a named node { value } for the island's @id; the store
  // answers store.get(iri) with the node; rawData is the island as parsed. Resolution, in LOSOS's order with two amendments:
  //   1. local panes: panes/<type>.js for every @type on the page (the directory is the registry), plus any <script data-pane src>;
  //   2. ui:view on the node: the page may name a pane for itself, shown after the local ones, never first, so a pane that
  //      verifies the page is never displaced by one the page chose;
  //   3. the public registry (solid-panes.github.io): @type -> manifest -> pane URL, consulted only when 1 and 2 gave nothing;
  //   4. the floor: the outline and the raw JSON, always the last two tabs.
  const wiki = (window.wiki = window.wiki || {}); wiki.panes = wiki.panes || []; wiki.ROOT = ROOT; wiki.el = el; wiki.link = link; wiki.value = value; wiki.table = table; wiki.hash = hash;
  wiki.registry = wiki.registry ?? 'https://solid-panes.github.io/';
  wiki.namedNode = (iri) => ({ termType: 'NamedNode', value: new URL(iri, location.href).href });
  // the page's store: every island by its resolved @id and by its fragment
  wiki.store = { nodes: new Map(), add(doc) { const id = doc['@id']; if (id) { this.nodes.set(new URL(id, location.href).href, doc); this.nodes.set(id, doc); } }, get(iri) { if (!iri) return null; const v = typeof iri === 'string' ? iri : iri.value; return this.nodes.get(v) || this.nodes.get(new URL(v, location.href).href) || null; } };
  // shared pieces for panes: a copy button, fact tiles, an id card of rows, a light with its text
  wiki.copyBtn = (text) => { const b = el('button', 'copy', 'copy'); b.onclick = (e) => { e.preventDefault(); navigator.clipboard.writeText(text).then(() => { b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }); }; return b; };
  wiki.facts = (pairs) => { const f = el('div', 'facts'); for (const [k, v] of pairs) if (v != null && v !== '') { const d = el('div', 'fact'); d.append(el('span', 'fk', k), el('span', 'fv', String(v))); f.append(d); } return f; };
  wiki.card = (rows) => { const c = el('div', 'idcard'); for (const [k, ...v] of rows) if (v.length && v[0] != null) { const r = el('div', 'prow'); r.append(el('span', 'pk', k)); const pv = el('span', 'pv'); pv.append(...v.map((x) => typeof x === 'string' ? document.createTextNode(x) : x)); r.append(pv); c.append(r); } return c; };
  wiki.light = (cls, text) => { const p = el('div', 'lit'); p.append(el('span', 'light ' + cls), text); return p; };
  wiki.types = (doc) => [].concat(doc['@type'] || []);
  wiki.has = (doc, t) => wiki.types(doc).includes(t);
  // one pinned toolkit for panes that verify: the kernel's codec, hashes, the curve, pinned by commit
  const SCHEMA = 'https://cdn.jsdelivr.net/gh/bitcoin-desktop/schema@b8cbf6337c7450fe14ddc5bce00c7280059aab5d/codec/';
  wiki.kit = () => (wiki._kit ??= (async () => { const [hash, secp, { Codec }, core] = await Promise.all([import(SCHEMA + 'hash.js'), import(SCHEMA + 'secp256k1.js'), import(SCHEMA + 'codec.js'), fetch('https://bitcoin-kernel.com/engine/schema/core.jsonld').then((r) => r.json())]); return { hash, secp, codec: new Codec(core) }; })());
  // bech32 / bech32m for addresses and npubs
  const CH = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l', GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  const pm = (v) => { let c = 1; for (const x of v) { const b = c >>> 25; c = ((c & 0x1ffffff) << 5) ^ x; for (let i = 0; i < 5; i++) if ((b >> i) & 1) c ^= GEN[i]; } return c >>> 0; };
  const words = (bytes) => { const w = []; let acc = 0, bits = 0; for (const b of bytes) { acc = (acc << 8) | b; bits += 8; while (bits >= 5) { bits -= 5; w.push((acc >> bits) & 31); } } if (bits) w.push((acc << (5 - bits)) & 31); return w; };
  const bech = (hrp, data, konst) => { const exp = [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)]; const p = pm([...exp, ...data, 0, 0, 0, 0, 0, 0]) ^ konst; const chk = []; for (let i = 0; i < 6; i++) chk.push((p >> (5 * (5 - i))) & 31); return hrp + '1' + [...data, ...chk].map((d) => CH[d]).join(''); };
  const unhex = (h) => Uint8Array.from(h.match(/../g).map((x) => parseInt(x, 16)));
  wiki.npub = (hex) => bech('npub', words(unhex(hex)), 1);
  wiki.address = (chain, spk) => { const hrp = /^(btc|xbt|mainnet)$/.test(chain) ? 'bc' : 'tb'; if (/^5120[0-9a-f]{64}$/.test(spk)) return bech(hrp, [1, ...words(unhex(spk.slice(4)))], 0x2bc830a3); if (/^0014[0-9a-f]{40}$/.test(spk) || /^0020[0-9a-f]{64}$/.test(spk)) return bech(hrp, [0, ...words(unhex(spk.slice(4)))], 1); return null; };
  wiki.scriptKind = (spk) => /^5120[0-9a-f]{64}$/.test(spk) ? 'taproot (P2TR)' : /^0014/.test(spk) ? 'P2WPKH' : /^0020/.test(spk) ? 'P2WSH' : /^76a914/.test(spk) ? 'P2PKH' : /^a914/.test(spk) ? 'P2SH' : /^6a/.test(spk) ? 'OP_RETURN (unspendable)' : 'other';
  // Nostr: the event id as NIP-01 serialises it, and the BIP 340 signature over it
  wiki.nostrCheck = async (ev) => { const { hash, secp } = await wiki.kit(); const ser = JSON.stringify([0, ev.pubkey, ev.created_at, ev.kind, ev.tags, ev.content]); const id = hash.bytesToHex(hash.sha256(new TextEncoder().encode(ser))); const idOK = id === ev.id; let sigOK = false; try { sigOK = idOK && secp.verifySchnorr(hash.hexToBytes(ev.id), hash.hexToBytes(ev.sig), hash.hexToBytes(ev.pubkey)); } catch {} return { id, idOK, sigOK }; };
  // marking: BIP 340 over sha256 of the canonical object (sorted keys, no whitespace, sig excluded)
  wiki.canon = (v) => v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(wiki.canon).join(',') + ']' : '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + wiki.canon(v[k])).join(',') + '}';
  wiki.markCheck = async (obj, signerDid) => { if (!obj.sig) return null; const { hash, secp } = await wiki.kit(); const { sig, ...rest } = obj; const msg = hash.sha256(new TextEncoder().encode(wiki.canon(rest))); const pk = (String(signerDid || '').match(/^did:nostr:([0-9a-f]{64})$/) || [])[1]; if (!pk) return false; try { return secp.verifySchnorr(msg, hash.hexToBytes(sig), hash.hexToBytes(pk)); } catch { return false; } };
  const asPane = (p) => typeof p.label === 'function' ? { ...p, label: p.name || 'view', canHandle: (subject, store) => !!p.label(store.get(subject) || {}), render: (subject, store, c, raw) => p.render(raw || store.get(subject), c) } : p; // an older wiki pane (label(doc), render(doc, el)) still works
  const loadScript = (src) => new Promise((res) => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = () => res(); document.head.append(s); });
  const loadModulePane = async (url) => { try { const m = await import(new URL(url, location.href).href); const p = m.default || m.pane; if (p && typeof p.render === 'function') return asPane(p); } catch (e) { console.warn('[wiki] pane failed to load', url, e.message); } return null; };
  async function localPanes(types) {
    for (const t of types) await loadScript(new URL('panes/' + String(t).toLowerCase() + '.js', ROOT).href); // in the island's @type order, so the first type's pane is the first tab
    for (const s of document.querySelectorAll('script[data-pane]')) { const p = await loadModulePane(s.getAttribute('src') || s.dataset.pane); if (p) wiki.panes.push(p); }
  }
  async function registryPanes(types, doc) {
    if (!wiki.registry) return [];
    try {
      const idx = await (await fetch(new URL('reverse-index.json', wiki.registry))).json(); const out = [];
      // the registry keys full IRIs (urn:solid:Note); a page may say the type short, so the local name is tried too
      const local = (k) => String(k).split(/[:/#]/).pop();
      for (const t of types) { const key = idx[t] ? t : Object.keys(idx).find((k) => local(k) === local(t)); const hit = key && idx[key]; if (!hit) continue; const ref = typeof hit === 'string' ? hit : hit.manifest || hit.url; if (!ref) continue; const manifest = await (await fetch(new URL(ref, wiki.registry))).json();
        if (manifest.schema && doc && !doc.$schema) doc.$schema = manifest.schema; // as solid-panes' autoSchema does: the registry's schema for the type, so a schema-driven pane can take it
        if (manifest.pane) { const p = await loadModulePane(new URL(manifest.pane, wiki.registry).href); if (p) { p.label = p.label || manifest.label || String(t); p.source = 'registry'; out.push(p); } } }
      return out;
    } catch { return []; }
  }
  const applies = (p, subject) => { try { return !!p.canHandle(subject, wiki.store); } catch (e) { console.warn('[wiki] canHandle failed:', p.label, e.message); return false; } };
  async function tabs(doc, sec) {
    const subject = wiki.namedNode(doc['@id'] || '#this');
    const views = wiki.panes.map(asPane).filter((p) => applies(p, subject));
    const own = doc['ui:view'] || doc.view; if (typeof own === 'string') { const p = await loadModulePane(own); if (p && applies(p, subject)) { p.label = (p.label || 'view') + ' · from the page'; views.push(p); } }
    if (!views.length) for (const p of await registryPanes(wiki.types(doc), doc)) if (applies(p, subject)) views.push(p);
    // the floor: the outline leaves out what the hero already shows
    const rest = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => !['@id', '@type', 'name', 'title', 'description'].includes(k)));
    views.push({ label: 'outline', canHandle: () => true, render: (s, st, e, d) => e.append(table(rest(d))) }, { label: 'raw', canHandle: () => true, render: (s, st, e, d) => e.append(el('pre', null, JSON.stringify(d, null, 2))) });
    const bar = el('div', 'tabs'); const body = el('div', 'view');
    const show = (v) => { body.replaceChildren(); try { v.render(subject, wiki.store, body, doc); } catch (e) { body.append(el('p', 'err', 'this view failed: ' + e.message)); } [...bar.children].forEach((b) => b.classList.toggle('on', b.dataset.label === v.label)); };
    // a tab is remembered only when the reader chose it, never from the first render
    for (const v of views) { const b = el('button', null, (v.icon ? v.icon + ' ' : '') + v.label); b.dataset.label = v.label; b.onclick = () => { show(v); try { localStorage.setItem('wiki-tab:' + location.pathname, v.label); } catch {} }; bar.append(b); }
    sec.append(bar, body); let remembered = null; try { remembered = localStorage.getItem('wiki-tab:' + location.pathname); } catch {} show(views.find((v) => v.label === remembered) || views[0]);
  }
  async function run() {
    const islands = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent); } catch (e) { return { '@type': 'ParseError', error: e.message }; } });
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    islands.forEach((d) => wiki.store.add(d));
    const types = new Set(islands.flatMap((d) => [].concat(d['@type'] || [])));
    await localPanes(types);
    const main = el('main', 'wiki');
    const nav = el('nav'); for (const [p, t, c] of [['index.html', 'epochs', 'wordmark'], ['index.html', 'packages'], ['https://github.com/bitcoin-blake/blaketestnode', 'blaketestnode'], ['https://assumeutxo.com/', 'assumeUTXO']]) { /* pages, me and trail stay reachable by link, off the nav for now */ const a = el('a', c, t); a.href = new URL(p, ROOT).href; nav.append(a); } main.append(nav);
    for (const [i, d] of islands.entries()) main.append(await island(d, i));
    if (!document.title && islands[0]) document.title = islands[0].name || islands[0]['@id'] || 'datawiki';
    // a quiet footer: where the source is
    const foot = el('footer', 'foot'); const src = el('a', null, 'source'); src.href = 'https://github.com/bitcoin-blake/epochs'; foot.append(src); main.append(foot);
    document.body.append(main);
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', run) : run();
})();
