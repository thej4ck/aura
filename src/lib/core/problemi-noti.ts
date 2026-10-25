// I problemi noti delle piattaforme (CLAUDE.md, «Problemi noti»): un avviso breve per l'adulto, solo sul
// dispositivo coinvolto e nel punto in cui serve (<ProblemaNoto id="…" />). Solo problemi verificati o
// documentati, con la fonte nel commento: «non provato» non è «noto».
// Ogni voce dà il testo quando il problema si applica al dispositivo, altrimenti false.
import { m } from '#lib/paraglide/messages.js';
import { dispositivo, type Dispositivo } from './piattaforma.ts';

const ios = (d: Dispositivo) => d.sistema === 'iOS';

export const PROBLEMI_NOTI = {
	// Con il microfono aperto iOS cambia la sessione audio: i suoni escono più piano, anche
	// dall'altoparlante delle telefonate, a volte anche dopo la chiusura (WebKit 218012, 230902, 295889,
	// 311451, 326286). Con le cuffie Bluetooth microfono e Web Audio insieme danno scatti e velocità
	// sbagliata (WebKit 221334, 258864); con il filo e il microfono interno va bene.
	'ios-microfono': (d) => ios(d) && m.problema_ios_microfono(),

	// Safari chiede il microfono a ogni visita finché non si sceglie «Consenti» per il sito
	// (support.apple.com/105120); nell'app installata a ogni apertura, senza impostazione (WebKit 215884, 327237).
	'ios-permesso-microfono': (d) =>
		ios(d) &&
		(d.app
			? m.problema_ios_permesso_app()
			: d.browser === 'Safari' && m.problema_ios_permesso_safari()),

	// ITP: dopo 7 giorni di uso del browser senza visite Safari cancella IndexedDB, cache e service worker;
	// le app installate hanno il loro conteggio (webkit.org/blog/10218, webkit.org/blog/14403). In tutti i
	// browser di iOS (webkit.org/blog/10882).
	'safari-dati-7-giorni': (d) =>
		d.apple && !d.app && (ios(d) ? m.problema_dati_7_giorni_ios() : m.problema_dati_7_giorni_mac()),

	// L'app installata (schermata Home, Dock) ha uno spazio dati suo, separato dal browser
	// (WebKit 181849, firt.dev/notes/pwa-ios, WWDC 2023 sessione 10120).
	'app-dati-separati': (d) => d.apple && !d.app && m.problema_app_dati_separati(),

	// Dopo un'altra app, lo schermo bloccato o un suono di sistema l'AudioContext può restare muto
	// ('interrupted', o 'running' fermo), e nell'app installata resume() può non risolversi mai
	// (WebKit 276016, 283419, 291892, 251532).
	'ios-audio-muto': (d) => ios(d) && m.problema_ios_audio_muto(),

	// Il tasto silenzioso ammutolisce Web Audio; audioSession 'playback' lo evita solo da iOS 17
	// (WebKit 237322, 251532, 252746).
	'ios16-silenzioso': (d) => ios(d) && d.versioneIos === 16 && m.problema_ios16_silenzioso(),

	// Senza outputLatency (Safari prima della 18.4) il ritardo del Bluetooth non si toglie da solo
	// (caniuse mdn-api_audiocontext_outputlatency, web.dev/articles/audio-output-latency).
	'output-latency-assente': (d) => d.webAudio && !d.outputLatency && m.problema_output_latency(),

	// Chrome per Android elenca anche voci da scaricare: legge l'italiano con una voce inglese
	// (readium.org/speech/docs/WebSpeech.html).
	'android-voce-italiana': (d) => d.sistema === 'Android' && m.problema_android_voce(),

	// Da iOS 17.4 IndexedDB può perdere la connessione al suo server, anche all'apertura, e non riaprirla da
	// sola (WebKit 273827, 197050, 235579). Senza Web Audio è la Modalità di isolamento (apple-isolamento).
	'ios-salvataggio': (d) =>
		ios(d) && d.webAudio && (d.versioneIos ?? 99) >= 17 && m.problema_ios_salvataggio(),

	// La Modalità di isolamento toglie Web Audio, getUserMedia e (da iOS 17) IndexedDB
	// (support.apple.com/105120, WebKit 266363).
	'apple-isolamento': (d) => d.apple && !d.webAudio && m.problema_apple_isolamento(),

	// Solo Firefox chiede all'utente il permesso per navigator.storage.persist() (MDN, Storage quotas and
	// eviction criteria; web.dev/articles/persistent-storage). FxiOS è WebKit.
	'firefox-persistenza': (d) =>
		d.browser === 'Firefox' && !ios(d) && m.problema_firefox_persistenza()
} satisfies Record<string, (d: Dispositivo) => string | false>;

export type IdProblema = keyof typeof PROBLEMI_NOTI;

/** Il testo del problema sul dispositivo corrente, oppure false: da chiamare nel browser. */
export const problemaNoto = (id: IdProblema): string | false => PROBLEMI_NOTI[id](dispositivo());
