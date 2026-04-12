# OmniaCreata Studio Docs

Bu klasor Studio icin tek giris noktasi olsun diye duzenlendi.

Amac:
- insanin da AI'nin da "once neyi okumaliyim?" sorusuna hizli cevap vermek
- canli truth ile tarihsel notlari ayirmak
- ayni konuyu anlatan daginik dosyalar yuzunden doc drift olusmasini azaltmak

## En Kolay Baslangic

Insan icin:
- [Master Plan TR](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/MASTER_PLAN_TR.md)

AI / IDE icin:
- [AI Context Pack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/00_AI_CONTEXT_PACK.md)

Current build ve operator truth icin:
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

## Bu Klasorde Neler Var?

- [wiki/](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/README.md)
  Urun anlami, mimari sinirlar, planlama mantigi ve ekip hafizasi
- [operations/](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/README.md)
  Current build, release gecmisi, maintenance truth ve operator bakisi
- [reference/](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/reference/README.md)
  Eski ama bazen hala yararli planlar, migration notlari ve tarihsel kararlar

## Hangi Soruda Hangi Dosyaya Gitmeli?

Studio tam olarak nasil bir urun?
- [Master Plan TR](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/MASTER_PLAN_TR.md)
- [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)

Su an hangi fazdayiz?
- [Master Plan TR](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/MASTER_PLAN_TR.md)
- [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)
- [Roadmap And Planning](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/06_ROADMAP_AND_PLANNING.md)

Teknik altyapi, backend omurgasi ve sinirlar nasil?
- [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
- [Engineering Standards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/04_ENGINEERING_STANDARDS.md)

Su an gercek build ne ve en son ne degisti?
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

Eski kararlarin arka plani neydi?
- [Reference Docs Hub](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/reference/README.md)

## Okuma Sirasi

Eger sifirdan anlamak istiyorsan:
1. [Master Plan TR](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/MASTER_PLAN_TR.md)
2. [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)
3. [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
4. [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)
5. [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)

## Doc Kurallari

Yeni bir Studio dokumani acmadan once sunu sec:
- `wiki/`: strateji, urun anlami, mimari sinir, planning memory
- `operations/`: current build, release, maintenance, operator truth
- `reference/`: tarihsel plan, eski direction lock, migration, archived context

Kurallar:
- current truth daginik notlarda degil; once `version.json`, release ledger, maintenance map ve ilgili wiki dosyalarinda okunur
- reference docs yararlidir ama current source of truth degildir
- yeni bir dosya acmadan once mevcut hub icine link eklemek veya mevcut dosyayi genisletmek tercih edilir
