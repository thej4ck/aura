<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.app_nome()}</title>
</svelte:head>

<!-- provvisoria: la home vera (Riprendi, Prossimo passo, Da ripassare, aree) arriva con la fase "shell" -->
<section class="benvenuto">
	<h1>{m.app_nome()}</h1>
	<p>{m.home_benvenuto()}</p>
</section>

<style>
	.benvenuto {
		display: flex;
		flex-direction: column;
		gap: var(--spazio-4);
		max-width: var(--larghezza-testo);
	}
	p {
		font-size: var(--testo-l);
		color: var(--colore-testo-tenue);
	}
</style>
