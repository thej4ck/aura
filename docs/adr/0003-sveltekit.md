# 0003. SvelteKit, Svelte 5 e TypeScript

Stato: accettata · 2026-10-21

## Contesto

Servono: routing con prerender di tutte le pagine, componenti interattivi leggeri (SVG del pentagramma, canvas del pitch meter), tipi forti per i contenuti, test unitari ed end-to-end, i18n, bundle piccoli per tablet economici.

## Decisione

- **SvelteKit 3 + Svelte 5 (runes) + TypeScript + Vite**, con `adapter-static` (vedi 0001).
- Con SvelteKit 3 la configurazione del kit sta in `vite.config.ts`, nelle opzioni del plugin `sveltekit()`: `svelte.config.js` non è più supportato. L'alias della libreria è `#lib` (sottopercorsi `imports` di `package.json`), non più `$lib`.
- Dipendenze a runtime ridotte al minimo: **Valibot** per validare i file importati e lo schema dei contenuti; il font **Atkinson Hyperlegible Next** via Fontsource, solo sottoinsieme latin.
- Nessuna libreria di componenti né di notazione musicale: componenti SVG propri dietro un modello dati standard (`Nota`, `Rigo`), così il renderer si può sostituire.
- Strumenti: ESLint, Prettier, svelte-check, Vitest (progetto `unit`, ambiente node, `src/**/*.test.ts`), Playwright con axe (`tests/`).

Alternative valutate: Astro (ottimo per pagine di contenuto, meno adatto a uno stato applicativo condiviso tra pagine), React o Next (runtime più pesante), JavaScript senza framework (routing, prerender e reattività da scrivere a mano).

## Conseguenze

- Le pagine sono HTML prerenderizzato che poi diventa interattivo: buone prestazioni anche senza server.
- Il passaggio ad `adapter-node`, se servirà, non richiede di riscrivere componenti o pagine.
- Dipendiamo dall'ecosistema Svelte: Dependabot tiene aggiornate le dipendenze ogni settimana e la CI verifica lint, tipi, test e build.
