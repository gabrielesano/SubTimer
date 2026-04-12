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
- **Hosting**: deploy pubblico su Cloudflare Workers tramite GitHub CI/CD.
  URL: `https://subsubtimer.gabrielesano.workers.dev`. Ogni push su `main`
  triggera un redeploy automatico.
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
separata (`subbuteo:rosters`) indipendente dalla partita corrente. Lo
storico delle partite concluse vive in una terza chiave
(`subbuteo:storico`) — vedi "Storico partite" più sotto.

### Stato partita

```
{
  squadre: {
    casa: { nome: string, rosa: string[], schema: ColorSchema | null },
    trasferta: { nome: string, rosa: string[], schema: ColorSchema | null }
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
  cartellini: Array<{
    squadra: "casa" | "trasferta",
    giocatore: string,
    tipo: "giallo" | "rosso",
    minutoGioco: number,       // stessa convenzione dei gol
    fase: string
  }>,
  actionOrder: Array<"goal" | "card">,  // ordine cronologico di push per undo
  rigori: Array<{
    squadra: "casa" | "trasferta",
    giocatore: string,
    esito: "gol" | "errore"
  }>
}
```

Il campo `actionOrder` tiene traccia dell'ordine in cui gol e cartellini
sono stati registrati, così il bottone "Annulla" può annullare sempre
l'ultima azione (gol o cartellino, indifferentemente). Lo `undoStack`
(redo stack) conserva oggetti `{ type: 'goal'|'card', event }`.

Il **punteggio non è memorizzato**: va calcolato al volo dall'array
`marcatori` (contando le entry per squadra). Questo elimina il rischio
di desincronizzazione tra punteggio e lista marcatori.

### Storage rose

```
{
  squadre: [
    {
      nome: "Italia",
      rosa: ["3 Giacinto Facchetti (D)", "7 Gigi Riva (A)", ...],
      schema: { id: "blu-bianco", pattern: "tinta-unita", colori: ["#2563eb"], pantaloncini: "#ffffff" }
    },
    ...
  ]
}
```

I nomi dei giocatori nelle rose usano il formato `"N Nome (Ruolo)"` dove
N è il numero di maglia (opzionale), e il ruolo abbreviato tra parentesi:
**(P)** portiere, **(D)** difensore, **(C)** centrocampista,
**(A)** attaccante. Rose senza numeri di maglia funzionano come prima.

### Schema colori (`ColorSchema`)

```
{
  id: string,                    // es. "blu-bianco" (maglia-pantaloncini)
  pattern: "tinta-unita" | "strisce-verticali" | "strisce-orizzontali",
  colori: string[],              // hex — 1 colore per tinta-unita, 2+ per strisce
  pantaloncini: string           // hex colore pantaloncini
}
```

Lo schema viene associato a ogni rosa tramite `rose-index.json`, copiato
nello stato partita all'avvio, e usato per impostare i CSS custom
properties `--color-home`, `--color-away`, `--color-home-bg`,
`--color-away-bg` (quest'ultime calcolate con `darkenHex()`).

### Rose predefinite e directory structure

Le rose predefinite risiedono nella directory `rose/`, organizzate
per schema colori:

```
rose/
  blu-bianco/
    rosa_italia_1970.json
    rosa_napoli_1986-87.json
  rosso-bianco/
    rosa_manchester_utd_1998-99.json
    rosa_urss_1970.json
```

Il file `rose-index.json` in root elenca gli schemi e le rose associate:

```json
{
  "schemi": [
    {
      "id": "blu-bianco",
      "pattern": "tinta-unita",
      "colori": ["#2563eb"],
      "pantaloncini": "#ffffff",
      "rose": ["rose/blu-bianco/rosa_italia_1970.json", ...]
    }
  ]
}
```

Le rose sono gestite nella schermata setup e riutilizzate tra partite.
Al primo avvio (localStorage vuoto), le rose vengono auto-importate
da `rose-index.json`. I dropdown di selezione squadre raggruppano le
rose per schema colori con `<optgroup>`. Dalla schermata setup è
possibile importare ulteriori file JSON con formato `{ nome, rosa }`.

All'inizio di una nuova partita, si selezionano due squadre dal
menu e le rose vengono **copiate** nello stato partita (non referenziate),
incluso lo schema colori, così modifiche successive alle rose non
toccano partite in corso.

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

**Fase FINITA**: quando la partita termina (dopo 2T, 2TS o RIGORI),
l'interfaccia di gioco viene sostituita da una schermata di riepilogo
(vedi sezione "Schermata riepilogo finale"). Il pannello riepilogo
resta attivo finché l'utente non tappa "Nuova partita".

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
- Bottone "Storico partite": apre la schermata storico (vedi sotto).
  Visibile solo se `subbuteo:storico` contiene almeno un'entry.
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
  lista compatta marcatori sotto ancora
  (`nome giocatore — minuto' FASE`, dove FASE è l'abbreviazione della
  fase in cui è avvenuto l'evento: `PT`, `ST`, `1°TS`, `2°TS`).
- Colonna centrale: timer gigantesco formato `MM:SS`, con bottone play/pausa
  grande sotto. Il timer diventa rosso quando si supera `durataFaseMs`.
- Colonna destra: specchio della sinistra per la squadra trasferta.

**Fascia inferiore**:
- Due bottoni grandi "+ GOL CASA" e "+ GOL TRASFERTA".
- Un bottone "CART." centrale per aprire l'overlay cartellini.
- Un bottone più piccolo ma accessibile "Annulla" (rimuove l'ultima
  azione registrata, sia essa un gol o un cartellino, secondo
  `actionOrder`).
- Un bottone "Ripristina" per recuperare un evento annullato per errore
  (redo). Lo stack di redo viene svuotato quando si registra un nuovo
  evento (gol o cartellino).

### Schermata riepilogo finale

Attivata automaticamente quando `fase === 'FINITA'`. Sostituisce la
fascia centrale e la bottom-bar (analogo al pannello RIGORI). Struttura:

- **Titolo**: "FINE PARTITA".
- **Punteggio finale**: nomi squadre + cifre grandi, stessi colori usati
  durante la partita (blu casa, rosso trasferta).
- **Riga rigori** (solo se presenti): sotto il punteggio, in italico,
  riporta il risultato ai rigori.
- **Elenco eventi per fase**, scrollabile, con separatori:
  - Ogni fase giocata è introdotta da un'etichetta full-width
    (bordo sopra/sotto, testo oro maiuscolo): "Primo tempo", "Secondo
    tempo", "Primo supplementare", "Secondo supplementare".
  - Sotto l'etichetta, gli eventi di quella fase (gol + cartellini)
    ordinati per `minutoGioco` crescente.
  - Se la fase è stata giocata ma non ha eventi → placeholder "Nessun
    evento" in italico.
  - Fasi da mostrare: 1T e 2T sempre; 1TS e 2TS solo se contengono
    eventi o se sono stati raggiunti i rigori (che implica supplementari
    giocati).
- **Sezione rigori** (solo se `rigori.length > 0`): etichetta "Rigori"
  e griglia round-per-round con l'esito di ciascun tiro (GOL/ERR),
  numerazione del round al centro.
- **Bottone "Nuova partita"**: in fondo, grande, color oro. Azzera la
  partita salvata e torna alla schermata setup.

Formato di ogni riga evento:
```
[● colore squadra]  [minuto']  [nome giocatore]  [tipo evento]
```
dove il tipo evento è `GOL` (verde), `● AMM.` (giallo) o `● ESP.` (rosso).

**Recovery al reload**: a differenza delle altre fasi, un salvataggio
con `fase === 'FINITA'` NON viene scartato da `loadMatch()`. Il
ripristino mostra la schermata di riepilogo. Solo tappando "Nuova
partita" viene chiamato `clearMatch()` e si torna al setup.

**Salvataggio nello storico**: nel momento in cui una partita entra in
`FINITA` (cioè quando l'utente preme "Fase successiva" dall'ultima fase
giocabile), una snapshot viene aggiunta in testa all'array
`subbuteo:storico` in `localStorage`. Il salvataggio è automatico e
avviene **una sola volta** per partita (un flag nello stato impedisce
duplicati al reload). Vedi "Storico partite" più sotto per il formato.

**Bottone Esporta**: in fondo al pannello di riepilogo, accanto al
bottone "Nuova partita", compare un bottone "Esporta" che genera il
riepilogo testuale e lo passa a `navigator.share({ text })` (iPadOS lo
supporta). Fallback: se `navigator.share` non esiste o rifiuta, copia
negli appunti via `navigator.clipboard.writeText` e mostra un toast
"Copiato negli appunti". Vedi "Export riepilogo" più sotto per il
formato testuale.

**Modalità read-only**: quando il riepilogo viene aperto da una partita
nello storico (non quella appena finita), il bottone "Nuova partita" è
sostituito da "Torna allo storico". Il bottone "Esporta" resta identico.
Nessun'altra differenza: i dati visualizzati sono gli stessi.

### Schermata storico partite

Raggiungibile dal bottone "Storico partite" nella schermata setup.
Sostituisce la schermata setup fino a quando non si torna indietro.

Struttura:
- **Titolo**: "STORICO PARTITE".
- **Bottone "Svuota storico"** in alto a destra. Apre una modale di
  conferma ("Eliminare tutte le partite salvate? L'operazione non è
  reversibile.") con bottoni "Annulla" / "Elimina tutto".
- **Lista partite**, dalla più recente in alto. Ogni riga mostra:
  ```
  [data]  Squadra casa  N — M  Squadra trasferta  [(X-Y dcr)]  [🗑]
  ```
  dove:
  - `data`: formato `GG/MM/AAAA HH:MM` (l'orario serve a distinguere
    più partite giocate lo stesso giorno).
  - `N — M`: risultato finale nei tempi regolamentari + supplementari
    (senza rigori).
  - `(X-Y dcr)`: suffisso mostrato solo se la partita è stata decisa ai
    rigori, con il risultato dei tiri dal dischetto.
  - `🗑`: icona elimina. Tap apre una modale di conferma ("Eliminare
    questa partita?") con "Annulla" / "Elimina".
- **Tap sulla riga** (in qualsiasi punto tranne l'icona elimina):
  carica la snapshot nella UI di riepilogo finale in modalità read-only.
- **Bottone "Indietro"** in basso per tornare alla schermata setup.

Se lo storico è vuoto (caso impossibile dalla setup se il bottone è
nascosto quando non ci sono partite, ma difensivo): mostrare "Nessuna
partita in archivio" al posto della lista.

### Storico partite (storage)

Chiave `localStorage`: `subbuteo:storico`.

```
Array<{
  id: string,                  // identificativo univoco (timestamp o uuid-like)
  data: number,                // Date.now() al momento del salvataggio
  squadre: { casa: {...}, trasferta: {...} },   // come lo stato partita
  marcatori: Array<...>,        // copiato tal quale
  cartellini: Array<...>,       // copiato tal quale
  rigori: Array<...>,           // copiato tal quale (anche se vuoto)
  phaseDurations: { '1T', '2T', '1TS', '2TS' }  // per rendering coerente
}>
```

Note:
- Nessun limite al numero di entry. `localStorage` ha spazio sufficiente
  per migliaia di partite vista la dimensione tipica (~qualche KB).
- Lo stato del timer non viene salvato (irrilevante a partita conclusa).
- Il campo `fase` non serve: è sempre `FINITA` per le entry in storico.
- La snapshot viene creata copiando i campi rilevanti dallo stato attivo
  al momento dell'ingresso in `FINITA`, **non** referenziando oggetti
  dello stato attivo (per isolamento rispetto a modifiche successive).

### Export riepilogo

Funzione `buildSummaryText(match)` che ritorna una stringa formattata a
partire da una partita (attiva o da storico, indifferente — la struttura
dei dati è la stessa).

Formato:

```
⚽ {nomeCasa} {gol casa} — {gol trasferta} {nomeTrasferta}
🎯 Rigori: {X} — {Y} ({nome vincitore})       ← solo se rigori.length > 0

PRIMO TEMPO
 {min}' {nome} ({TAG})                         ← gol
 {min}' 🟨 {nome} ({TAG})                      ← ammonizione
 {min}' 🟥 {nome} ({TAG})                      ← espulsione

SECONDO TEMPO
 ...

PRIMO SUPPLEMENTARE                            ← solo se giocato
 ...

SECONDO SUPPLEMENTARE                          ← solo se giocato
 ...

Rigori:                                        ← solo se rigori.length > 0
 1. {TAG_casa} ✓ — {TAG_trasferta} ✓
 2. {TAG_casa} ✓ — {TAG_trasferta} ✗
 ...

—
SubTimer · https://subsubtimer.gabrielesano.workers.dev
```

dove `{TAG}` è un'abbreviazione a 3 lettere maiuscole del nome squadra
(prime 3 lettere del nome, es. `NAP`, `JUV`, `ITA`).

Regole:
- Se una fase regolamentare (1T, 2T) non ha eventi → stampare comunque
  l'intestazione e, sotto, ` (nessun evento)` in corsivo testuale —
  oppure, più semplice, omettere la sezione. **Scelta**: omettere le
  sezioni senza eventi (testo più compatto, più leggibile in chat).
- Le fasi supplementari vanno incluse solo se `phaseHasAnyEvent()` vale
  true per quella fase oppure se sono stati giocati i rigori (implica
  supplementari). Stessa logica della schermata riepilogo.
- Emoji `⚽ 🎯 🟨 🟥 ✓ ✗` incluse nel testo: è il formato standard per
  condivisione in chat.
- Footer con URL dell'app: firma + promo, una sola riga.

Condivisione:
1. Tap su "Esporta" → `text = buildSummaryText(currentMatch)`.
2. Se `navigator.share` esiste → `navigator.share({ text })`. L'utente
   vede il foglio di condivisione nativo di iPadOS.
3. Altrimenti → `navigator.clipboard.writeText(text)` + toast "Copiato
   negli appunti" per 2 secondi.
4. Entrambe le API vanno in try/catch: se l'utente annulla o l'API
   fallisce, nessun errore visibile.

### Overlay cartellino

Quando l'utente preme "CART.":
1. Si cattura il minuto corrente (stessa logica dei gol).
2. Appare un overlay modale con, in alto, due gruppi di toggle:
   - Squadra: `[CASA] [TRASFERTA]` (default: casa).
   - Tipo: `[GIALLO] [ROSSO]` (default: giallo).
3. Sotto i toggle, la griglia dei giocatori della squadra selezionata.
4. Al cambio di squadra, la griglia viene rigenerata.
5. Al tap su un giocatore, il cartellino viene registrato con il minuto
   catturato all'apertura dell'overlay e l'overlay si chiude.
6. Un bottone "Annulla" permette di uscire senza registrare.

Il cartellino si aggiunge all'array `cartellini` e viene mostrato nel
tabellino della squadra corrispondente, intercalato cronologicamente con
i gol (ordinamento per `fase` secondo `PHASES`, poi per `minutoGioco`).
I cartellini sono distinti visivamente da un marker colorato (giallo o
rosso) prima del nome del giocatore.

Nessuna regola calcistica è imposta dall'applicazione: l'utente può
assegnare più cartellini allo stesso giocatore, l'app non sostituisce
automaticamente due gialli con un rosso né blocca i gol di un giocatore
espulso. È uno strumento di tracciamento, non un arbitro virtuale.

All'overlay cartellino non si accede durante la fase RIGORI né a partita
FINITA.

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

## Gestione audio

### Sblocco iOS

Safari iPadOS non permette di riprodurre audio senza una prima interazione
utente nella pagina. Va gestito così:

1. Al primo evento `pointerdown` sulla pagina (qualsiasi), inizializza un
   `AudioContext`.
2. Fai suonare un oscillatore a volume zero per "sbloccare" effettivamente
   il canale.
3. Il listener resta attivo su tutta la pagina: in caso di `state === 'suspended'`
   lo si risveglia con `audioCtx.resume()`.
4. Conserva il riferimento all'`AudioContext` per i suoni successivi.

**Limite noto**: se l'iPhone/iPad è in modalità silenziosa, Web Audio API
non produce suono. È un limite di sistema, non aggirabile.

### Sistema audio procedurale

Tutti i suoni sono **generati proceduralmente** via Web Audio API. Nessun
file audio esterno, nessun asset da scaricare, niente da cachare.

**Fischio arbitro** (`playWhistle(kind)` + helper `whistleBlow()`):
rumore bianco → 2 bandpass stretti in cascata (Q=30, Q=20) a 2700 Hz +
onda sinusoidale tonale con vibrato a 7 Hz. Varianti:
- `1` (singolo, ~0.75s) → avvio tempo su Play
- `2` (doppio) → scadenza 1T o 1TS (fine primo tempo / supplementare)
- `3` (triplo) → scadenza 2T o 2TS (fine regolamentare / fine partita)
- `'short'` (~0.18s, 3100 Hz) → per ogni rigore tirato

**Esultanza folla** (`playCrowdCheer()`): rumore rosa (approssimazione
Voss-McCartney) → highpass a 250 Hz → bandpass vocale (850–1250 Hz
randomizzato) → tremolo LFO 5–9 Hz → inviluppo con attack rapido, plateau,
decay lento. Tutti i parametri hanno un grado di randomizzazione per
evitare ripetitività tra un gol e l'altro. Suona al:
- Gol registrato (selezione giocatore nell'overlay)
- Rigore con esito `gol`

**Vincolo**: mantenere l'approccio procedurale. Non aggiungere file audio
esterni. Se un suono non convince, tocca i parametri (frequenze dei
filtri, durata, Q, LFO) — non sostituire con sample.

Su desktop (Firefox/Chrome) il meccanismo è ridondante rispetto al problema
iOS ma funziona identicamente.

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
(punteggio, timer pausa/play, transizione fase, registrazione gol o
cartellino). Al caricamento della pagina:

1. Se esiste uno stato partita salvato → ripristina e mostra la
   schermata appropriata:
   - Se `fase === 'FINITA'` → mostra direttamente la schermata di
     riepilogo finale (resta visibile finché l'utente non tappa
     "Nuova partita").
   - Altrimenti → mostra la schermata partita.
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

- Secondo display/proiezione su TV.
- Possesso palla, statistiche avanzate, numero tiri.
- Multi-utente, sincronizzazione, backend.
- Gestione intervallo come fase con timer.
- Autenticazione o protezione accesso.

Spostate in-scope il 2026-04-12 su richiesta esplicita dell'utente
(da specificare in dettaglio prima dell'implementazione):

- Storico partite passate.
- Export del riepilogo partita.

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
