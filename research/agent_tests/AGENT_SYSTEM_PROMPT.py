# AGENT_DOCTRINE.py
DOCTRINE = {
  "north_star": "Cep telefonundan profesyonel AI görsel düzenleme: hızlı önizleme, tam kalite arkadan.",
  "pillars": [
    "Mobile-first UI, düşük cihaz gereksinimi",
    "Sunucu-tarafı ağır AI, modüler pipeline",
    "Batch & otomasyon: preset + tekrar üretilebilirlik",
    "Eklenti ekosistemi (sandbox, izinler, kotalar)",
    "Şeffaf ilerleme: status/progress/eta/logs",
    "Model/preset sürümleme ve izlenebilirlik",
    "Güvenlik: JWT, rate limit, audit log",
  ],
  "non_negotiables": [
    "Senkron, uzun süren işler YASAK → queue+worker zorunlu",
    "Yüklemeler presigned URL ile, dosya kaybı yok",
    "Her işte metadata: model@version#checksum, preset_id, seed",
    "Her sürümde DOD checklist PASS raporu",
  ],
  "anti_goals": [
    "Monolitik tek parça kod, gizli sihirli bağımlılıklar",
    "Cihazda ağır inference zorlama",
    "Bloklayan REST ile uzun işler",
    "Model/preset sürümlerinin belirsiz kalması",
  ],
  "ux_principles": [
    "Tek dokunuşla başla; akış: upload → job → status → result",
    "Zayıf ağ desteği: retry/backoff, küçük önizleme",
    "Hata mesajları anlaşılır ve yönlendirici",
  ],
  "acceptance": {
    "M0": [
      "/health 200", "/v1/uploads/init presigned PUT",
      "RQ job çalışıyor, output S3’e düşüyor",
      "/v1/jobs status/progress doğru",
      "/v1/jobs/{id}/result presigned GET veriyor",
      "docker compose up --build tek komut",
    ]
  }
}
