# SubbuteoBoard

Cronometro e tabellino per partite di Subbuteo, pensato per iPad in landscape.

**App live:** https://subbuteoboard.gabrielesano.workers.dev

## Cos'è

Una PWA single-file (HTML + CSS + JS vanilla inline) che gestisce una
partita di Subbuteo: cronometro per tempi regolamentari e supplementari,
punteggio, marcatori con minuto e fase, ammonizioni/espulsioni, tiri di
rigore, riepilogo finale.

Funziona offline grazie a un service worker, si installa come app sul
tablet e genera tutti i suoni (fischio arbitro, esultanza tifosi)
proceduralmente via Web Audio API — nessun asset audio esterno.

## Stack

- `index.html` — tutta l'app (HTML, CSS e JS inline).
- `sw2.js` — service worker per l'uso offline.
- `manifest.json` — manifest PWA.
- `rose-index.json` + `rose/` — rose predefinite organizzate per schema colori.
- Hosting: Cloudflare Workers (deploy automatico su push a `main`).

Nessun framework, nessun bundler, nessuna dipendenza runtime.

## Documentazione

- [`SPEC.md`](SPEC.md) — specifica funzionale completa.
- [`ROADMAP.md`](ROADMAP.md) — idee e miglioramenti futuri.
