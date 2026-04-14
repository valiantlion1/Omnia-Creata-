# Studio Shell Baseline Matrix

Bu belge `.87` shell baseline sweep'ini ve `.88` completion wave sonucunu tek yerde toplar.

Amac:
- gorunen yuzeylerde neyin gercekten calistigini netlestirmek
- fake CTA ile honest limited state'i ayirmak
- current-build closure proof yenilenmeden once shell gercegini sabitlemek

## Builds

- Baseline capture build: `2026.04.13.87`
- Completion + closure candidate build: `2026.04.13.88`
- Post-closure continuation builds: `2026.04.13.89` -> `2026.04.13.93` (`.88` shell baseline'i korunur; `.89+` active lane'i public-paid readiness truth ve operator proof sync hattidir)

## Status Anahtari

- `healthy`: gorunen yuzey calisiyor ve beklenen davranisi veriyor
- `beta-limited`: yuzey bilerek sinirli, backoffice, support-assisted, ya da protected-beta snapshot olarak sunuluyor
- `fixed in .88`: `.87`te drift vardi, `.88`te dar completion wave ile kapandi

## Surface Matrix

| Surface | `.87` Baseline | `.88` Sonucu | Sinif | Not |
| --- | --- | --- | --- | --- |
| `Explore` | kismen guven veriyordu ama bos feed durumunda dekoratif hissedebiliyordu | `fixed in .88` | `UI/backend truth mismatch` | arama/sort sonucu, curated fallback ve real empty state ayni truth modeline baglandi |
| `Create` | oran secimi ve lane dili daha temizdi ama bunun current shell truth oldugu aciklastirilmaliydi | `healthy` | `contract drift` | tek ratio chooser + 6 standart oran korunuyor; sahte tier tiyatrosu yok |
| `Library / My Images` | temel mutation'lar calisiyordu | `healthy` | `route integration gap` | `Set public`, `Set private`, `Move to project`, `Move to trash`, `Reuse prompt`, `Reuse style`, `Create variations`, `Edit in Chat` ayrimi korundu |
| `Projects` | kart/lightbox paritesi geri gelmisti | `healthy` | `route integration gap` | project ici gorsel tiklama lightbox ile ayni truth yolunu kullaniyor |
| `Trash` | menu anchor ve restore akisi duzeltilmisti | `healthy` | `route integration gap` | `Restore` ve `Delete forever` tetikleyicinin altinda aciliyor; reload sonrasi state korunuyor |
| `Settings` | bir kisim row gercek, bir kisim backoffice sinirliydi | `healthy` + `beta-limited` | `UI/backend truth mismatch` | calisan ayarlar calisiyor; self-serve olmayanlar artik sahte buton gibi davranmiyor |
| `Control Center` | provider/system visibility vardi ama community controls self-serve degildi | `healthy` + `beta-limited` | `UI/backend truth mismatch` | `Run Check` gercek refresh yapiyor; user/admin analytics satirlari backoffice durumu olarak kaliyor |
| `Billing` | en buyuk kalan drift buradaydi; fake processing ve dead CTA izi vardi | `fixed in .88` | `UI/backend truth mismatch` | current plan status, activity copy ve enterprise CTA protected-beta truth'a cekildi |
| `Help` | final legal contract gibi konusmak icin fazla erkendi | `beta-limited` | `contract drift` | protected-beta snapshot guide olarak korunuyor; final legal pass degil |
| `Landing` | public marketing copy'nin bir kismi current truth'tan ilerideydi | `beta-limited` | `contract drift` | hardware/capacity vaadi yerine protected-beta-safe copy korundu |

## Closed In The Completion Wave

- Billing shell drift daraltildi:
  - fake `Processing...` hali temizlendi
  - raw activity adlari urun diline cekildi
  - enterprise plan dead button olmaktan cikti ve gercek contact path'e dondu
  - internal/founder accounts ordinary metered-customer gibi gorunmeyi birakti
- Explore hero copy current public-gallery truth ile hizalandi
- Current-build operator artefact zinciri `.88`te yeniden senkronlandi:
  - local verify
  - provider smoke
  - protected staging verify

## Current-Build Proof Snapshot

Protected-beta closure baseline: `2026.04.13.88`
Current operator-truth build: `2026.04.13.93`

- local verify (`.93`): `pass`
- provider smoke (`.93`): `warning-grade current-build report` (OpenAI lanes proven; placeholder-backed chat lanes now read as `skipped/not_configured` instead of fake auth failures)
- protected staging verify (`.93`): `warning`, ama `closure_ready=true`
- protected beta stage (`.93`): `ready`
- next stage (`.93`): `Public Paid Platform`

## Out Of Scope By Design

- watermark/publishing polish
- final pricing strategy
- full semantic search
- final legal/public launch copy
- yeni top-level feature acmak

Bu matrix'in default yorumu su:
- gorunen shell yuzeyleri ya calisiyor
- ya da artik acikca `protected-beta-limited`
- protected-beta closure claim'i stale artefact yerine `.88` baseline + `.92` current-build proof zincirine dayanir
