# Sicurezza

## Segnalare una vulnerabilità

Per favore **non aprire una issue pubblica**.

Usa la segnalazione privata di GitHub: nella scheda **Security** del repository scegli **Report a vulnerability**.
La segnalazione resta visibile solo a te e ai manutentori, e diventa un [GitHub Security Advisory](https://docs.github.com/it/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).

Indica, se puoi:

- cosa succede e quale impatto ha;
- i passi per riprodurre il problema (browser, dispositivo, pagina);
- una proposta di correzione, se ne hai una.

Ti risponderemo appena possibile, ti terremo aggiornato e, se lo desideri, ti citeremo nell'advisory quando la correzione sarà pubblicata.

## Cosa consideriamo una vulnerabilità

Oltre ai problemi di sicurezza classici (XSS, aggiramento della CSP, file importati che alterano lo stato in modo inatteso), per questo progetto contano anche i problemi di **privacy**: qualsiasi richiesta verso terzi, cookie, tracciamento o fuga di dati dal browser, compreso l'audio del microfono, è una vulnerabilità.

## Versioni supportate

È supportata solo la versione pubblicata dal branch `main`.
