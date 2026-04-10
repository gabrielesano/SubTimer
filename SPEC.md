# Tabellone Digitale Subbuteo — Specifica di Progetto

## Contesto e obiettivo

App web per tenere traccia dei dati di partite di subbuteo/Zeugo, da usare
durante le partite casalinghe. L'app gira sul PC di casa (Fedora Linux) come
semplice web server statico, ed è acceduta da un iPad collegato alla stessa
rete wifi. Non è per competizioni ufficiali — è un tool personale.

L'iPad viene usato in landscape, tenuto sul tavolo accanto al campo da gioco,
e l'interfaccia deve essere completamente utilizzabile tramite touch senza
mai ricorrere alla tastiera software.

## Vincoli tecnici e scelte di stack

- **Frontend**: singolo file `index.html` con CSS e JavaScript vanilla.
  Nessun framework (no React, no Vue, no build step).
- **Persistenza**: `localStorage` del browser. Nessun backend, nessun database.
- **Server**: servito staticamente da `python -m http.server 8080` (o simile)
  lanciato dal PC locale. Accesso da iPad via `http://<ip-pc>:8080`.
- **PWA**: l'app deve essere installabile sull'iPad come PWA standalone
  (manifest + service worker minimale per caching statico).
- **Orientamento**: landscape obbligatorio.
- **Browser target primari**: Safari iPadOS (uso reale) e Firefox/Chrome
  desktop (sviluppo e test).

Il codice va scritto in modo difensivo rispetto alle API browser: ogni uso
di API non universalmente supportate (Wake Lock, Web Audio) deve essere
protetto da feature detection e degradare gracefully.

## Modello dati

Tutto lo stato della partita vive in un singolo oggetto JavaScript,
serializzato in `localStorage` a ogni modifica sotto una chiave dedicata
(es. `subbuteo:matchState`). Le rose giocatori vivono in una chiave
separata (`subbuteo:rosters`) indipendente dalla partita corrente.

### Stato partita

```
{
  squadre: {
    casa: { nome: string, rosa: string[] },
    trasferta: { nome: string, rosa: string[] }
  },
  fase: "1T" | "2T" | "1TS" | "2TS" | "RIGORI" | "FINITA",
  timer: {
    elapsedMs: number,         // tempo giocato accumulato nella fase corrente
    running: boolean,
    startedAt: number | null,  // Date.now() quando è partito l'ultimo run
    durataFaseMs: number       // durata configurata per questa fase
  },
  marcatori: Array<{
    squadra: "casa" | "trasferta",
    giocatore: string,
    minutoGioco: number,       // minuto arrotondato all'intero superiore
    fase: string               // la fase in cui è stato segnato
  }>,
  rigori: Array<{
    squadra: "casa" | "trasferta",
    giocatore: string,
    esito: "gol" | "errore"
  }>
}
```

Il **punteggio non è memorizzato**: va calcolato al volo dall'array
`marcatori` (contando le entry per squadra). Questo elimina il rischio
di desincronizzazione tra punteggio e lista marcatori.

### Storage rose

```
{
  squadre: [
    { nome: "Italia", rosa: ["Giacinto Facchetti (D)", "Gigi Riva (A)", ...] },
    { nome: "Unione Sovietica", rosa: [...] },
    ...
  ]
}
```

I nomi dei giocatori nelle rose includono il ruolo abbreviato tra
parentesi: **(P)** portiere, **(D)** difensore, **(C)** centrocampista,
**(A)** attaccante.

Le rose sono gestite nella schermata setup e riutilizzate tra partite.
Al primo avvio (localStorage vuoto), le rose vengono auto-importate
dai file JSON presenti nella directory (`rosa_italia.json`,
`rosa_urss.json`). Dalla schermata setup è possibile importare
ulteriori file JSON con formato `{ nome, rosa }`.

All'inizio di una nuova partita, si selezionano due squadre dal
menu e le rose vengono **copiate** nello stato partita (non referenziate),
così modifiche successive alle rose non toccano partite in corso.

## Logica timer

Punto critico del progetto, da implementare con attenzione.

**Principio**: `elapsedMs` rappresenta il tempo *giocato* (escluse le pause)
della fase corrente. Il tempo reale trascorso non interessa — quello che
conta è solo il cronometro di gioco.

**Play**: `startedAt = Date.now()`, `running = true`.

**Pausa**: `elapsedMs += Date.now() - startedAt`, `startedAt = null`,
`running = false`.

**Display**: il valore mostrato si calcola ad ogni frame come
`elapsedMs + (running ? Date.now() - startedAt : 0)`, formattato come
`MM:SS`. Aggiornamento a ~10 Hz con `requestAnimationFrame` o
`setInterval(100)`.

**Scadenza fase**: quando il tempo calcolato supera `durataFaseMs`, il
display diventa rosso e parte un beep sonoro (una volta sola, non in loop).
**Il timer non si ferma automaticamente** — continua a contare oltre, per
simulare il recupero. Sta all'utente premere pausa e passare alla fase
successiva quando lo decide.

**Registrazione gol e minuto di gioco**: quando si registra un gol, si
cattura il tempo giocato corrente e lo si **arrotonda all'intero superiore**
in minuti (convenzione calcistica: un gol a `12:34` diventa `13'`). Questo
risolve il problema della pausa: che l'utente metta in pausa prima o dopo
l'inserimento del marcatore, il minuto catturato è lo stesso, perché si
basa sul tempo giocato e non sul tempo reale.

## Macchina a stati delle fasi

Flusso lineare senza intervalli (scelta esplicita per uso casalingo):

```
1T (20 min) → 2T (20 min) → [fine se non pareggio]
            → 1TS (5 min) → 2TS (5 min) → [fine se non pareggio]
            → RIGORI (no timer) → FINITA
```

**Transizione "fase successiva"**: bottone dedicato. Quando premuto:
1. Azzera `elapsedMs` a 0.
2. Imposta `durataFaseMs` secondo la nuova fase (20 min per 1T/2T,
   5 min per 1TS/2TS, non applicabile per RIGORI).
3. Mette il timer in pausa (`running = false`, `startedAt = null`).
4. Aggiorna `fase` allo stato successivo.

**Durate di default personalizzabili nel setup**: 20 minuti per i tempi
regolamentari, 5 minuti per i supplementari. L'utente deve poterle
modificare dalla schermata setup prima di iniziare la partita.

**Fine partita anticipata**: dopo 2T, se il punteggio non è in parità,
la fase va direttamente a FINITA saltando i supplementari. Stessa logica
dopo 2TS verso i rigori. Questo controllo avviene al momento della
transizione "fase successiva" guardando il punteggio calcolato.

**Fase RIGORI**: niente timer. L'interfaccia cambia per permettere di
registrare sequenze di rigori alternati, ognuno con esito gol/errore.
Quando matematicamente una squadra ha vinto, mostra il risultato finale
ma lascia comunque la possibilità di passare manualmente a FINITA.

**Navigazione indietro**: serve un modo per tornare alla fase precedente
nel caso si prema "fase successiva" per sbaglio. Da collocare in un menu
secondario (es. icona ingranaggio in alto) per evitare tap accidentali
durante il gioco.

## Interfaccia utente

### Schermata setup (iniziale)

Mostrata all'apertura se non c'è una partita in corso, oppure raggiungibile
da un bottone "nuova partita" dalla schermata principale.

Elementi:
- Selezione squadra casa da menu a tendina popolato dalle rose salvate.
- Selezione squadra trasferta, stessa cosa.
- Input numerici per durata tempi regolamentari (default 20) e supplementari
  (default 5), in minuti.
- Sezione "Gestione rose": permette di creare/modificare/eliminare squadre
  e i loro giocatori. Interfaccia semplice con lista squadre, e per ogni
  squadra una lista editabile di nomi giocatori.
- Bottone grande "Inizia partita" che inizializza lo stato e passa alla
  schermata partita.

### Schermata partita (principale)

Layout a tre fasce orizzontali, pensato per iPad in landscape:

**Fascia superiore (sottile)**:
- A sinistra: indicatore fase corrente (serie di badge 1T, 2T, 1TS, 2TS, R
  con quello attivo evidenziato).
- A destra: bottone "Fase successiva" (medio-grande).
- In alto a destra, piccola: icona menu/impostazioni per accesso a funzioni
  secondarie (fase precedente, nuova partita, reset).

**Fascia centrale (grande, protagonista)**:
- Colonna sinistra: nome squadra casa in alto, punteggio enorme sotto,
  lista compatta marcatori sotto ancora (`nome giocatore — minuto'`).
- Colonna centrale: timer gigantesco formato `MM:SS`, con bottone play/pausa
  grande sotto. Il timer diventa rosso quando si supera `durataFaseMs`.
- Colonna destra: specchio della sinistra per la squadra trasferta.

**Fascia inferiore**:
- Due bottoni grandi "+ GOL CASA" e "+ GOL TRASFERTA".
- Un bottone più piccolo ma accessibile "Annulla" (rimuove
  l'ultima entry dall'array marcatori).
- Un bottone "Ripristina" per recuperare un gol annullato per errore
  (redo). Lo stack di redo viene svuotato quando si registra un nuovo gol.

### Overlay selezione marcatore

Quando l'utente preme "+ GOL CASA" (o trasferta):
1. Appare un overlay modale che copre la schermata.
2. Mostra la rosa della squadra selezionata come griglia di bottoni grandi
   (un bottone per giocatore, testo grande).
3. L'utente tocca il giocatore.
4. L'overlay si chiude e il gol viene registrato con il minuto calcolato
   in quel momento.
5. L'overlay deve avere un bottone "Annulla" per uscire senza registrare.

**Importante**: il minuto va catturato nel momento in cui si preme
"+ GOL CASA", NON nel momento in cui si seleziona il giocatore nell'overlay.
Questo perché l'utente potrebbe metterci qualche secondo a scegliere il
nome e nel frattempo il timer avanza. Quindi:
- Su "+ GOL CASA" → cattura il minuto corrente, apre overlay.
- Su scelta giocatore → registra il gol con il minuto già catturato.

### Requisiti touch e dimensionamento

- Bottoni principali minimo 80×80 px, meglio più grandi.
- Nessun `:hover` state (irrilevante su touch, può causare bug di sticky
  highlight su iOS).
- Feedback visivo immediato al tap (es. `:active` con background più scuro).
- Contrasto alto (dark theme consigliato per visibilità su tavolo illuminato).
- Font grandi e leggibili a distanza (almeno 16px per testi secondari,
  molto più grande per punteggio e timer).
- Layout in CSS Grid o Flexbox, dimensioni in `vh`/`vw` per adattarsi a
  schermi diversi senza scroll.

## Gestione audio (sblocco iOS)

Safari iPadOS non permette di riprodurre audio senza una prima interazione
utente nella pagina. Va gestito così:

1. Al primo evento `pointerdown` sulla pagina (qualsiasi), inizializza un
   `AudioContext`.
2. Opzionalmente, fai suonare un beep a volume zero per "sbloccare"
   effettivamente il canale.
3. Rimuovi il listener dopo la prima esecuzione (one-shot).
4. Conserva il riferimento all'`AudioContext` per i beep successivi.

Il beep di scadenza fase può essere generato proceduralmente con un
`OscillatorNode` (es. onda sinusoidale a 880 Hz per 400 ms, con inviluppo
per evitare click) — niente file audio esterni, niente asset da caricare.

Su desktop (Firefox/Chrome) questo meccanismo è ridondante ma innocuo.

## Wake Lock

Per impedire che l'iPad spenga lo schermo durante la partita:

```javascript
if ('wakeLock' in navigator) {
  const lock = await navigator.wakeLock.request('screen');
  // riacquisire su visibilitychange se l'app torna visibile
}
```

Va richiesto quando la partita inizia (transizione dal setup alla schermata
partita) e **riacquisito** al `visibilitychange` quando la pagina torna
visibile, perché iOS rilascia il wake lock in background.

Se l'API non è supportata, l'app deve funzionare comunque senza errori.

## Persistenza e recovery

Lo stato partita è serializzato in `localStorage` a ogni modifica
(punteggio, timer pausa/play, transizione fase, registrazione gol). Al
caricamento della pagina:

1. Se esiste uno stato partita salvato e la fase non è `FINITA` → ripristina
   e mostra la schermata partita direttamente.
2. Altrimenti → mostra la schermata setup.

**Attenzione al timer durante il recovery**: se l'utente ricarica la pagina
mentre il timer era in `running`, alla ripartenza NON bisogna assumere che
sia passato il tempo reale trascorso (l'iPad potrebbe essere stato in
background per ore). Al recovery, il timer va sempre ripristinato in stato
**pausa**, con `elapsedMs` pari all'ultimo valore salvato e `startedAt = null`.
L'utente dovrà premere play esplicitamente per riprendere.

Questo implica che i salvataggi in `localStorage` devono congelare
`elapsedMs` al valore calcolato (non grezzo): quando si salva mentre il
timer gira, bisogna salvare
`elapsedMs + (Date.now() - startedAt)` come nuovo `elapsedMs` e
`startedAt = null`. Oppure — approccio alternativo — salvare solo negli
eventi discreti (pausa, gol, transizione fase) dove il valore è già
stabile.

## PWA

File richiesti oltre a `index.html`:

- `manifest.json`: nome, short_name, `display: standalone`,
  `orientation: landscape`, `start_url: /`, icone (almeno 192 e 512 px),
  `background_color` e `theme_color` coerenti col dark theme.
- `sw.js`: service worker minimale che fa caching di `index.html`,
  `manifest.json`, e delle icone in fase di `install`, e serve dalla cache
  in fase di `fetch` (strategia cache-first per i file statici).
- Icona dell'app in PNG (placeholder accettabile per la prima versione).

Il service worker va registrato da `index.html` con un
`if ('serviceWorker' in navigator)`.

## Roadmap di sviluppo suggerita

Step incrementali, ognuno testabile autonomamente:

1. **Scheletro HTML/CSS** del layout partita con valori statici hardcoded.
   Verificare su iPad che le dimensioni touch siano corrette.
2. **Timer funzionante** con play/pausa, senza fasi e senza suono. Solo
   `elapsedMs`, display `MM:SS`, bottone play/pausa.
3. **Macchina a stati fasi** + transizioni + cambio durata per fase +
   diventare rosso allo scadere + beep sonoro (con sblocco audio) +
   wake lock.
4. **Punteggio e marcatori base**: bottoni "+1 casa" e "+1 trasferta",
   array marcatori, display punteggio calcolato, "annulla ultimo gol".
   Senza rose, il marcatore è vuoto o placeholder.
5. **Schermata setup** + gestione rose in `localStorage` (CRUD squadre e
   giocatori) + inizializzazione partita dal setup.
6. **Overlay selezione marcatore** dalla rosa della squadra selezionata,
   con cattura del minuto al momento del tap sul bottone "+gol".
7. **Persistenza stato partita** in `localStorage` + recovery al reload
   con timer forzato in pausa.
8. **Fase RIGORI** con interfaccia dedicata (no timer, sequenza alternata,
   esito gol/errore).
9. **PWA**: manifest + service worker + icone + verifica installazione
   su iPad.

Ogni step chiude un pezzo funzionale e lascia l'app comunque usabile.

## Cosa NON fare in questa versione

Esplicitamente fuori scope per la prima versione (richiesto dall'utente):

- Ammonizioni e espulsioni.
- Export del riepilogo partita.
- Storico partite passate.
- Secondo display/proiezione su TV.
- Possesso palla, statistiche avanzate, numero tiri.
- Multi-utente, sincronizzazione, backend.
- Gestione intervallo come fase con timer.
- Autenticazione o protezione accesso.

Tutte queste possono essere aggiunte in future iterazioni, ma NON vanno
implementate ora nemmeno in forma preliminare, per mantenere l'app snella
e focalizzata.

## Note di sviluppo e test

- Fedora ha `firewalld` attivo: per testare dall'iPad serve aprire la porta
  del server con `sudo firewall-cmd --add-port=8080/tcp` (senza
  `--permanent` per richiudere al reboot).
- Lo sviluppo iniziale può avvenire interamente su browser desktop
  (Firefox/Chrome). Testare su iPad vero almeno dopo lo step 3 per sanity
  check.
- Firefox DevTools ha una modalità "responsive design" con preset iPad
  utile per verificare il layout senza passare al dispositivo reale.
- Usare sempre eventi `pointerdown`/`pointerup` (unificano mouse e touch)
  invece di `click` per ridurre la latenza percepita su touch.
