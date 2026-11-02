# Checklist di test manuale (iPad)

Le verifiche sono in ordine: ogni blocco usa solo funzioni già verificate
nei blocchi precedenti. Prima di iniziare: aprire l'app installata sulla
schermata Home, online.

## 1. Base: finestre di dialogo

- [ ] Partita completa veloce: Inizia → Play/Pausa → gol casa → cartellino
      → Annulla → Ripristina → Fase succ. ×2 → riepilogo → Esporta.
- [ ] "Fase succ." apre la finestra dell'app (non quella grigia di
      sistema); "Annulla" non cambia fase.
- [ ] Storico: elimina una partita, "Svuota storico": entrambe chiedono
      conferma con la finestra dell'app.

## 2. Schermata setup

- [ ] Scorrere la pagina partendo col dito su "INIZIA PARTITA" o su
      "Elimina": non devono attivarsi.
- [ ] Selezionare casa/trasferta, eliminare un'altra squadra: le selezioni
      restano.
- [ ] "+ Nuova" con un nome già esistente → avviso.
- [ ] Iniziare una partita con durate 15/3, tornare al setup, chiudere e
      riaprire l'app: squadre e durate sono quelle usate.
- [ ] "Esporta backup" → foglio di condivisione → "Salva su File".
- [ ] "Importa backup" con quel file → riepilogo → Importa: nessun
      duplicato nello storico.

## 3. Tema e colori

- [ ] Italia vs Napoli (stesso blu): la trasferta ha un colore diverso.
- [ ] Passare al tema chiaro e chiudere/riaprire l'app: nessun flash
      scuro all'avvio, barra di stato coerente.
- [ ] Squadre bianche o nere leggibili in entrambi i temi.
- [ ] Swatch della divisa accanto ai nomi (strisce per squadre a strisce).

## 4. Timer

- [ ] Play, aspettare ~1 minuto, passare a un'altra app per qualche
      minuto, forzare la chiusura di SubbuteoBoard dal multitasking,
      riaprire: il timer è in pausa e mostra circa il tempo giocato prima
      di uscire (non 00:00).
- [ ] Tap sul timer in pausa: nessuna tastiera, i bottoni +/− funzionano,
      Annulla non cambia il tempo.
- [ ] Portare il timer oltre la durata (es. 20:30) e segnare: `20+1'`
      in tabellino, riepilogo ed export.

## 5. Eventi

- [ ] Tap rapidi su "+ GOL CASA": il gol non viene mai registrato su un
      giocatore senza averlo scelto.
- [ ] Ammonire due volte lo stesso giocatore: badge gialli nella griglia,
      avviso "Secondo giallo", bottone attenuato.
- [ ] In 2T, "Annulla" su un gol del 1T → richiesta di conferma.
- [ ] Riepilogo: i quadratini AMM./ESP. sono colorati.

## 6. Fasi e rigori

- [ ] 1T a 18:00 → Fase succ. → menu ⚙ → Fase precedente: si torna al 1T
      a 18:00.
- [ ] Partita finita dopo il 2T (non in parità) → Fase precedente → 2T.
- [ ] Pareggio fino ai rigori: scegliere un tiratore, tirare; il tiratore
      compare nel riepilogo e nell'export.
- [ ] Casa 3 gol su 3, trasferta 0 su 3 → "VINCE" senza tiri inutili.
- [ ] Da riepilogo dopo i rigori → Fase precedente: i rigori ci sono
      ancora. Concludere di nuovo: nello storico c'è una sola partita.
- [ ] Menu ⚙ → Nuova partita durante il gioco → conferma "Abbandona".

## 7. Offline e aggiornamenti

- [ ] Modalità aereo, aprire l'app: si avvia; "Sincronizza rose dal
      server" funziona.
- [ ] Dopo un deploy, con l'app già aperta in background: tornando in
      primo piano compare "Nuova versione disponibile"; "Aggiorna"
      ricarica mantenendo la partita in corso (in pausa).
