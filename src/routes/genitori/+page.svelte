<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<!-- segnaposto: la pagina vera arriva con la fase "shell" -->
<svelte:head>
	<title>{m.layout_genitori()} – {m.app_nome()}</title>
</svelte:head>

<h1>{m.layout_genitori()}</h1>
<p>{m.segnaposto_testo()}</p>
