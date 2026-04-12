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
- **Rose predefinite (catalogo)**: set di rose classiche precaricate
  selezionabili da un catalogo nella schermata setup.
- **Numeri di maglia**: numero opzionale per giocatore, visibile
  nell'overlay e nel tabellino.
- **Tema colori per squadra**: colore primario associato a ogni squadra
  nella rosa, applicato a punteggio e bottoni gol.
- **Icona app personalizzata**: sostituire il placeholder con un'icona
  disegnata ad hoc.

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
