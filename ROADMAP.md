# Roadmap futura — Miglioramenti cosmetici e UX

## Audio atmosfera

- **Fischio arbitro all'avvio tempo**: un fischio singolo quando si preme
  play per la prima volta in una fase (1T, 2T, 1TS, 2TS).
- **Doppio fischio a fine primo tempo**: quando si passa da 1T a 2T.
- **Triplo fischio a fine partita**: quando si passa a FINITA.
- **Esultanza tifosi al gol**: breve audio di folla che esulta quando
  viene registrato un gol. Variare leggermente il suono per evitare
  ripetitività (pitch random, durata variabile).
- **Fischio rigore**: fischio corto prima di ogni tiro dal dischetto.
- Tutti i suoni generati proceduralmente con Web Audio API (rumore
  bianco filtrato per la folla, oscillatori per i fischi), nessun file
  audio esterno.

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
- **Schermata finale riepilogativa**: quando la partita finisce, mostrare
  un riepilogo con punteggio, marcatori, rigori, durata totale.
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

- **Storico partite**: salvare i risultati delle partite passate in
  localStorage e renderli consultabili.
- **Export riepilogo**: generare un testo o immagine condivisibile con
  il risultato della partita.
- **Icona app personalizzata**: sostituire il placeholder con un'icona
  disegnata ad hoc.
