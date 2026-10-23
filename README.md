# epochs

Epoch packages for the BLAKE2b chains: one file per 2016-block retarget epoch, carrying what a node needs to
verify that epoch without the UTXO set, and the UTXO set commitment at both ends.

An epoch package (`<chain>/<end height>.json`, JSON-LD `@type` `Epoch`) holds:

- the block hash, coin count and MuHash of the UTXO set at the epoch's start and end, computed the way
  Core's `gettxoutsetinfo muhash` does it, so any Core-derived node with `coinstatsindex` can check them;
- a bitmap over the outputs the epoch created, saying which are still unspent at its end (the hints);
- the data of every older coin the epoch spent (the side data), which is what lets the blocks be validated
  with scripts on and no set to look coins up in.

Consecutive packages chain: each one's start is the previous one's end. The first package of a chain starts at
an assumeUTXO snapshot. The format is produced and consumed by
[blaketestnode](https://github.com/bitcoin-blake/blaketestnode) and will track the draft SwiftSync BIPs
(455–457) as their coin format settles.

## Chains

| chain | network | packages | index |
|---|---|---|---|
| txbt4 | `btc:testnet4-blake2b` | [txbt4/](txbt4/) | [txbt4/index.json](txbt4/index.json) |

`<chain>/index.json` lists every package with its sha256, size, heights, hashes, MuHash at both ends and the
torrent's infohash, web seeds and magnet. The page at https://bitcoin-blake.github.io/epochs/ renders it.

## Fetching

Each package is served three ways and the bytes are the same whichever you use:

- HTTPS from this repo on GitHub Pages, with CORS;
- HTTPS from the R2 bucket `pub-8cae8bad22cf4f44b22188af9b1c0064.r2.dev/epochs/<chain>-<end>.json`, with CORS and ranges;
- BitTorrent and WebTorrent: `<chain>/<end>.json.torrent` beside the package, with the two HTTPS copies as
  web seeds, so a swarm of zero peers still completes.

Check what you got: `sha256sum <end>.json` against `index.json`.

## Verifying

```
git clone https://github.com/bitcoin-blake/blaketestnode && cd blaketestnode && npm install
node bin/blaketestnode.mjs epoch verify /path/to/153216.json --data <empty dir> --blocks-url <blocks url>
```

The verifier replays the epoch's blocks from the package and the served blocks alone, scripts on, and reports
the end MuHash. It must equal `end.muhash` in the package, and in turn a node's `gettxoutsetinfo muhash` at
that height.

## Adding a package

```
node tools/index.mjs <chain>      # rebuilds <chain>/index.json from the packages and torrents present
```

Torrents are made with `seeder/make-torrent.mjs` from
[play-grounds/utxo-swarm](https://github.com/play-grounds/utxo-swarm), piece length 256 KiB, web seeds this
repo and R2.
