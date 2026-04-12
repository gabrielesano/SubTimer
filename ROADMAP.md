# Roadmap futura — Miglioramenti cosmetici e UX

## Audio atmosfera

- ~~**Suono all'avvio tempo**~~: ✅ fischio arbitro singolo su Play.
- ~~**Fischio arbitro procedurale**~~: ✅ `playWhistle()` — rumore bianco
  filtrato bandpass + sine con vibrato. Varianti 1 (avvio), 2 (fine 1T/1TS),
  3 (fine 2T/2TS), `'short'` (rigore).
- ~~**Esultanza tifosi al gol**~~: ✅ `playCrowdCheer()` — rumore rosa +
  bandpass vocale + tremolo LFO. Parametri randomizzati (durata, frequenza
  centrale, velocità tremolo, picco di gain) per evitare ripetitività.
- Tutti i suoni generati proceduralmente con Web Audio API, nessun file
  audio esterno.
- **Nota**: Web Audio API non suona su iOS/Android con telefono in
  silenzioso — è un limite di sistema, non aggirabile.

## Animazioni e feedback visivo

- **Flash del punteggio al gol**: il numero del punteggio si ingrandisce
  brevemente con un'animazione di scala + colore più intenso.
- **Pulsazione del timer in scadenza**: quando il timer è rosso (tempo
  scaduto), farlo pulsare lentamente per attirare l'attenzione.
- **Transizione tra fasi**: breve fade o slide quando si cambia fase.
- **Animazione rigori**: evidenziare il cerchio del rigore appena tirato
  con una breve animazione di comparsa.

## Interfaccia

- **Conferma "Fase successiva"**: modale di conferma prima di avanzare
  fase, per evitare tap accidentali durante il gioco.
- **Vibrazione al tap** (dove supportata): feedback aptico sui bottoni
  principali tramite `navigator.vibrate()`.
- ~~**Schermata finale riepilogativa**~~: ✅ quando `fase === 'FINITA'`,
  sostituisce la fascia centrale con pannello dedicato: punteggio finale,
  risultato rigori se presenti, eventi (gol + cartellini) raggruppati per
  fase con separatori, sezione rigori round-per-round, bottone "Nuova
  partita". Il riepilogo persiste anche dopo reload (loadMatch non scarta
  più le partite FINITA). Durata totale non inclusa — non tracciata.
- **Tema colori per squadra**: associare un colore primario a ogni squadra
  nella rosa (es. azzurro Napoli, rosso Manchester) e usarlo nei bottoni
  gol e nel punteggio.

## Gestione rose

- **Ordinamento giocatori per ruolo**: nella griglia dell'overlay gol,
  raggruppare visivamente P/D/C/A con separatori o colori diversi.
- **Numeri di maglia**: aggiungere numero opzionale ai giocatori e
  mostrarlo nell'overlay e nella lista marcatori.
- **Rose predefinite**: includere un set di rose classiche precaricate
  selezionabili da un catalogo.

## Timer

- **Modifica tempo al tap**: toccando il timer (in pausa) si apre un
  overlay con input MM:SS per impostare manualmente il tempo trascorso.
  Utile per correzioni, per riprendere una partita interrotta, o per
  allineare il cronometro dopo un'interruzione lunga.

## Qualità della vita

- **Storico partite**: in-scope dal 2026-04-12, spec completa in
  `SPEC.md` ("Schermata storico partite" + "Storico partite (storage)").
  Da implementare.
- **Export riepilogo**: in-scope dal 2026-04-12, spec completa in
  `SPEC.md` ("Export riepilogo"). Solo testo via Web Share API +
  fallback clipboard. Da implementare.
- **Icona app personalizzata**: sostituire il placeholder con un'icona
  disegnata ad hoc.
