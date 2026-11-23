# Fortuna — Ruota della Fortuna

Applicazione Angular standalone per estrazioni casuali, con modalità Ruota 3D e Case Opening, gestione dei partecipanti e link condivisibili.

## Avvio

Non sono richiesti servizi o asset esterni. Con le dipendenze installate:

```bash
npm start
```

Apri `http://localhost:4200/`. In alternativa, `npx ng serve`.

## Funzionalità

- Aggiunta singola o multipla, modifica, esclusione e ripristino delle voci.
- Condivisione dello stato tramite parametro URL `wheel`.
- Estrazione con forza regolabile o caricamento tenendo premuto il pulsante.
- Modalità Ruota classica e Case Opening con reveal Gold, effetti audio sintetici disattivabili.

## Verifica

```bash
npm run build
npm test -- --watch=false
```

Lo stato e le logiche condivise sono in `src/app/services/`; i componenti standalone sono organizzati sotto `src/app/components/`.
