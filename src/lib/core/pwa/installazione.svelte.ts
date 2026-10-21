// L'invito a installare l'app (Chromium: beforeinstallprompt) arriva una volta per documento, poco dopo
// il caricamento, quando di solito si è ancora nella home: lo si tiene da parte fin dall'avvio
// (hooks.client.ts), così InstallaApp in /genitori lo trova anche arrivandoci con la navigazione interna.

// evento non standard (Chromium): non è nei tipi del DOM
export type PromptInstallazione = Event & { prompt(): Promise<unknown> };

export const installazione = $state<{ invito?: PromptInstallazione; installata: boolean }>({
	installata: false
});

export function ascoltaInstallazione(): void {
	addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		installazione.invito = e as PromptInstallazione;
	});
	addEventListener('appinstalled', () => {
		installazione.installata = true;
		installazione.invito = undefined;
	});
}
