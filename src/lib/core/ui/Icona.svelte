<script lang="ts" module>
	// Path SVG da Lucide (https://lucide.dev, licenza ISC), riscritti come soli <path> 24×24 con tratto 2.
	// Per aggiungere un'icona: copiare i path da Lucide (cerchi e rettangoli convertiti in path) e citarla qui.
	const ICONE = {
		'freccia-sinistra': ['m12 19-7-7 7-7', 'M19 12H5'],
		'freccia-destra': ['M5 12h14', 'm12 5 7 7-7 7'],
		play: ['M6 3l14 9-14 9z'],
		pausa: [
			'M15 4h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
			'M7 4h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z'
		],
		ricomincia: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
		'passo-indietro': ['M19 20 9 12l10-8z', 'M5 19V5'],
		'passo-avanti': ['M5 4l10 8-10 8z', 'M19 5v14'],
		volume: [
			'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
			'M16 9a5 5 0 0 1 0 6',
			'M19.364 18.364a9 9 0 0 0 0-12.728'
		],
		check: ['M20 6 9 17l-5-5'],
		info: ['M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0', 'M12 16v-4', 'M12 8h.01'],
		lampadina: [
			'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5',
			'M9 18h6',
			'M10 22h4'
		],
		stella: [
			'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'
		],
		chiudi: ['M18 6 6 18', 'm6 6 12 12'],
		orologio: ['M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0', 'M12 6v6l4 2'],
		copia: [
			'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z',
			'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'
		],
		lucchetto: [
			'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z',
			'M7 11V7a5 5 0 0 1 10 0v4'
		],
		germoglio: [
			'M7 20h10',
			'M10 20c5.5-2.5.8-6.4 3-10',
			'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z',
			'M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z'
		],
		occhio: [
			'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
			'M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0'
		],
		insieme: [
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
			'M5 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
			'M22 21v-2a4 4 0 0 0-3-3.87',
			'M16 3.13a4 4 0 0 1 0 7.75'
		],
		matita: [
			'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
			'm15 5 4 4'
		],
		libro: [
			'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z',
			'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'
		],
		gioco: [
			'M6 11h4',
			'M8 9v4',
			'M15 12h.01',
			'M18 10h.01',
			'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z'
		]
	} as const satisfies Record<string, readonly string[]>;

	export type NomeIcona = keyof typeof ICONE;
	export const NOMI_ICONE = Object.keys(ICONE) as NomeIcona[];
</script>

<script lang="ts">
	type Props = {
		nome: NomeIcona;
		/** lato dell'icona; di default segue il testo */
		dimensione?: string;
		/** testo alternativo: senza, l'icona è decorativa (aria-hidden) */
		etichetta?: string;
		/** riempie la forma (es. stella conquistata) */
		riempita?: boolean;
		class?: string;
	};

	let { nome, dimensione = '1.25em', etichetta, riempita = false, class: classe }: Props = $props();
</script>

<svg
	class={['icona', classe]}
	viewBox="0 0 24 24"
	width={dimensione}
	height={dimensione}
	fill={riempita ? 'currentColor' : 'none'}
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={etichetta ? 'img' : undefined}
	aria-label={etichetta}
	aria-hidden={etichetta ? undefined : 'true'}
	focusable="false"
>
	{#each ICONE[nome] as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	.icona {
		flex: none;
		display: inline-block;
		vertical-align: -0.2em;
	}
</style>
