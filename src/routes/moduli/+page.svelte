<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<!-- segnaposto: la pagina vera arriva con la fase "shell" -->
<svelte:head>
	<title>{m.layout_moduli()} – {m.app_nome()}</title>
</svelte:head>

<h1>{m.layout_moduli()}</h1>
<p>{m.segnaposto_testo()}</p>
