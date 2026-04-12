# Roadmap futura

## Implementati

- ~~**Suono all'avvio tempo**~~: ✅ fischio arbitro singolo su Play.
- ~~**Fischio arbitro procedurale**~~: ✅ `playWhistle()` — rumore bianco
  filtrato bandpass + sine con vibrato. Varianti 1 (avvio), 2 (fine 1T/1TS),
  3 (fine 2T/2TS), `'short'` (rigore).
- ~~**Esultanza tifosi al gol**~~: ✅ `playCrowdCheer()` — rumore rosa +
  bandpass vocale + tremolo LFO. Parametri randomizzati per evitare
  ripetitività. Tutti i suoni generati proceduralmente con Web Audio API.
- ~~**Schermata finale riepilogativa**~~: ✅ pannello dedicato con
  punteggio, eventi raggruppati per fase, rigori round-per-round, bottone
  "Nuova partita". Persiste dopo reload.
- ~~**Storico partite**~~: ✅ snapshot automatica in `localStorage` al
  termine della partita, schermata lista con data/risultato, riepilogo
  read-only, eliminazione singola e svuota tutto.
- ~~**Export riepilogo**~~: ✅ testo formattato con emoji, condivisione
  via Web Share API + fallback clipboard.

## Da implementare

- ~~**Conferma "Fase successiva"**~~: ✅ `confirm()` nativo prima di
  avanzare fase, per evitare tap accidentali.
- ~~**Modifica tempo al tap**~~: ✅ tap sul timer in pausa apre overlay
  MM:SS per impostare il tempo trascorso. Conferma/Annulla + Enter.
- ~~**Ordinamento giocatori per ruolo**~~: ✅ griglia overlay gol e
  cartellini raggruppata per ruolo (A→C→D→P, poi Altri) con separatori.
  Funzione condivisa `populatePlayerGrid`.
- ~~**Rose predefinite (catalogo)**~~: ✅ directory `rose/` organizzata
  per schema colori, `rose-index.json` come indice, auto-import al
  primo avvio, dropdown raggruppati per schema.
- ~~**Numeri di maglia**~~: ✅ parsing formato `"10 Nome (Ruolo)"`.
  Badge numerico nell'overlay, numero nel tabellino live, summary e
  export. Retrocompatibile: rose senza numeri funzionano come prima.
  I file JSON delle rose vanno aggiornati manualmente con dati verificati.
- ~~**Tema colori per squadra**~~: ✅ schema colori (`ColorSchema`) con
  pattern tinta-unita/strisce, CSS custom properties dinamiche
  (`--color-home`, `--color-away`, bg variants), rose organizzate in
  `rose/<schema>/` con `rose-index.json`, dropdown raggruppati per schema.
- ~~**Icona app personalizzata**~~: ✅ logo `logo_hd.png` usato per
  icone PWA (192/512), nella top-bar durante la partita e nella
  schermata setup al posto del titolo testuale.

## Idee secondarie (nice to have)

Miglioramenti cosmetici non indispensabili, implementabili se avanza tempo:

- **Vibrazione al tap**: feedback aptico sui bottoni principali via
  `navigator.vibrate()`.
- **Pulsazione timer in scadenza**: animazione CSS pulsante quando il
  timer è rosso (tempo scaduto).
- **Flash punteggio al gol**: animazione scala + colore al cambio score.
- **Animazione rigori**: effetto di comparsa sul cerchio dell'ultimo
  rigore tirato.
- **Transizione tra fasi**: fade o slide al cambio fase.
