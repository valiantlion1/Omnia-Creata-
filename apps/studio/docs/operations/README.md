# Operations Docs

Bu klasor Studio'nun canli operator truth katmanidir.

Buradaki belgeler su sorulara cevap verir:
- current build ne?
- en son ne degisti?
- hangi teknik alanlar stabil, hangileri riskli?

## Ana Dosyalar

- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
  build-by-build degisim tarihi ve "neden degisti?" ozeti
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)
  su anki stabil alanlar, dikkat noktalar ve guvenli varsayimlar

Bu klasorun mantigi:
- "bugun ne dogru?" sorusunu cevaplamak
- tarihsel planlari current truth gibi gostermemek
- build, verify ve maintenance bilgisini tek yerde toplamak

## History

Tarihsel operasyon planlari:
- [STUDIO_BACKEND_PHASE_PLAN_2026-04-04.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/history/STUDIO_BACKEND_PHASE_PLAN_2026-04-04.md)

## Kural

Current truth once burada okunur.
Eski planlar yardimci olabilir ama current build truth yerine gecmez.

Repo disi runtime raporlari da bu katmanin parcasidir.
Ozellikle local verify, provider smoke ve staging verify ciktilari `%LOCALAPPDATA%\\OmniaCreata\\Studio\\...` altinda tutulur; git icinde saklanmaz.
