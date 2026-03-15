from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import health, auth, jobs, storage
from .config import settings
from fastapi.responses import HTMLResponse

app = FastAPI(
    title="OmniaPixels API",
    description="Image processing and AI enhancement API",
    version="1.0.0",
    docs_url="/docs" if settings.APP_ENV == "dev" else None,
    redoc_url="/redoc" if settings.APP_ENV == "dev" else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.APP_ENV == "dev" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(storage.router)

# Auto-create tables when using local SQLite
try:
    if settings.DATABASE_URL.startswith("sqlite"):
        from .database import Base, engine  # noqa
        from . import models  # ensure models are imported

        @app.on_event("startup")
        async def _init_sqlite():
            Base.metadata.create_all(bind=engine)
except Exception:
    # Do not fail app startup if import order issues occur
    pass


@app.get("/")
async def root():
    return {
        "message": "OmniaPixels API",
        "version": "1.0.0",
        "docs": f"{settings.API_BASE_URL}/docs" if settings.APP_ENV == "dev" else None
    }


@app.get("/demo", response_class=HTMLResponse)
async def demo_page():
    html = """
    <!doctype html>
    <html lang=\"tr\">
    <head>
      <meta charset=\"utf-8\">
      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
      <title>OmniaPixels Demo</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
        .card { background: #111827; border-radius: 12px; padding: 1.5rem; max-width: 720px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
        h1 { margin-top: 0; font-size: 1.6rem; }
        label { display:block; margin: 0.5rem 0 0.25rem; color:#94a3b8; }
        input[type=file] { margin-bottom: 1rem; }
        button { background: #22c55e; color:#001a09; border:none; padding:0.6rem 1rem; border-radius:8px; cursor:pointer; font-weight:600; }
        button:disabled { opacity: .5; cursor:not-allowed; }
        .muted { color:#94a3b8; font-size: 0.9rem; }
        .row { display:flex; gap:0.75rem; flex-wrap:wrap; }
        .pill { background:#1f2937; border:1px solid #374151; padding:0.25rem 0.5rem; border-radius:999px; font-size:0.85rem; }
        a { color:#60a5fa; }
        pre { background:#0b1020; padding:0.75rem; border-radius:8px; overflow:auto; }
        .section { background:#0b1020; border:1px solid #1f2937; padding:0.75rem; border-radius:8px; margin-top:0.75rem; }
      </style>
    </head>
    <body>
      <div class=\"card\">
        <h1>OmniaPixels — Mini Demo</h1>
        <p class=\"muted\">Adımlar: 1) Oturum başlat 2) Dosya yükle 3) İş başlat 4) Sonucu gör</p>
        <div class=\"row\">
          <button id=\"btnSession\">1) Oturum Başlat</button>
          <button id=\"btnStats\" disabled>İstatistikleri Getir</button>
        </div>
        <div id=\"authInfo\" class=\"muted\" style=\"margin-top:.5rem\"></div>
        <div id=\"creditInfo\" class=\"muted\" style=\"margin-top:.25rem\"></div>
        <hr style=\"border-color:#1f2937\" />

        <label>Dosya Seç</label>
        <input id=\"file\" type=\"file\" />
        <div class=\"row\">
          <button id=\"btnUpload\" disabled>2) Yükle</button>
          <span id=\"uploadInfo\" class=\"muted\"></span>
        </div>

        <div class=\"section\">\n          <div class=\"row\">\n            <span class=\"pill\">Seçenekler</span>\n          </div>\n          <label><input type=\"checkbox\" id=\"opt4x\" /> 4x Upscale (+1 kredi)</label>\n          <label><input type=\"checkbox\" id=\"optDeblur\" /> Deblur (+1 kredi)</label>\n          <label><input type=\"checkbox\" id=\"optBG\" /> Arkaplan Kaldır (+1 kredi)</label>\n          <div id=\"presetBox\" style=\"margin-left:1rem; display:none\">\n            <label>BG Preset</label>\n            <select id=\"selPreset\">\n              <option value=\"transparent\">Transparent PNG</option>\n              <option value=\"white\">White Background (JPEG)</option>\n              <option value=\"shadowed\">Shadowed Background (PNG)</option>\n            </select>\n          </div>\n          <div class=\"muted\" style=\"margin-top:0.5rem\">2x baseline ücretsiz; 4x, Deblur, BG Remove: her biri +1 kredi.</div>\n        </div>

        <div class=\"row\" style=\"margin-top:1rem\">\n          <button id=\"btnStartJob\" disabled>3) İş Başlat</button>\n          <span id=\"jobInfo\" class=\"muted\"></span>\n        </div>

        <div style=\"margin-top:1rem\" id=\"statusArea\"></div>
        <div style=\"margin-top:0.5rem\" id=\"resultArea\"></div>
      </div>

      <script>
        const api = window.location.origin;
        let token = null;
        let currentKey = null;
        let currentJobId = null;

        function ui() {
          document.getElementById('btnUpload').disabled = !token || !document.getElementById('file').files.length;
          document.getElementById('btnStartJob').disabled = !token || !currentKey;
          document.getElementById('btnStats').disabled = !token;
        }

        function rndEmail(){
          const r = Math.random().toString(16).slice(2,10);
          return `demo_${r}@example.com`;
        }

        async function updateCredits(){
          if (!token) return;
          try {
            const r = await fetch(`${api}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!r.ok) return;
            const me = await r.json();
            document.getElementById('creditInfo').textContent = `Krediler: ${me.credits ?? 0}`;
          } catch (e) { /* ignore */ }
        }

        async function ensureSession() {
          if (token) return token;
          const email = rndEmail();
          const password = 'Passw0rd!';
          try {
            await fetch(`${api}/auth/register`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({email, password})
            });
          } catch (e) { /* ignore duplicate */ }
          try {
            const lr = await fetch(`${api}/auth/login`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({email, password})
            });
            if (!lr.ok) {
              const msg = `Giriş başarısız (HTTP ${lr.status}). Sunucu veya veritabanı çalışmıyor olabilir.`;
              document.getElementById('authInfo').textContent = msg;
              alert(msg);
              return null;
            }
            const data = await lr.json();
            token = data.access_token;
            if (!token) {
              const msg = 'Giriş yanıtı geçersiz: access_token yok';
              document.getElementById('authInfo').textContent = msg;
              alert(msg);
              return null;
            }
            document.getElementById('authInfo').textContent = `Giriş yapıldı: ${email}`;
            await updateCredits();
            ui();
            return token;
          } catch (e) {
            const msg = `Giriş isteği başarısız: ${e}`;
            document.getElementById('authInfo').textContent = msg;
            alert(msg);
            return null;
          }
        }

        async function doUpload() {
          await ensureSession();
          const file = document.getElementById('file').files[0];
          const fd = new FormData();
          fd.append('file', file);
          const r = await fetch(`${api}/storage/upload_multipart`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd
          });
          const res = await r.json();
          currentKey = res.key;
          document.getElementById('uploadInfo').textContent = `key: ${currentKey}`;
          ui();
        }

        async function startJob() {
          const params = {};
          if (document.getElementById('opt4x').checked) params.upscale_4x = true;
          if (document.getElementById('optDeblur').checked) params.deblur = true;
          if (document.getElementById('optBG').checked) {
            params.bg_remove = true;
            params.bg_preset = document.getElementById('selPreset').value;
          }
          const body = { queue: 'image_processing', input_key: currentKey, params };
          const r = await fetch(`${api}/api/v1/jobs/`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
            body: JSON.stringify(body)
          });
          const job = await r.json();
          currentJobId = job.id;
          document.getElementById('jobInfo').textContent = `job_id: ${currentJobId}`;
          await updateCredits();
          pollStatus();
        }

        async function pollStatus() {
          const area = document.getElementById('statusArea');
          area.textContent = 'Durum: bekleniyor...';
          const iv = setInterval(async () => {
            const g = await fetch(`${api}/api/v1/jobs/id/${currentJobId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!g.ok) return;
            const jd = await g.json();
            area.textContent = `Durum: ${jd.status}`;
            if (jd.status === 'completed' || jd.status === 'failed') {
              clearInterval(iv);
              if (jd.output_key) {
                const result = document.getElementById('resultArea');
                result.innerHTML = '';
                const btn = document.createElement('button');
                btn.textContent = 'Çıktıyı indir';
                btn.onclick = () => downloadOutput(jd.output_key);
                result.appendChild(btn);
              }
            }
          }, 1000);
        }

        async function downloadOutput(key){
          await ensureSession();
          const resp = await fetch(`${api}/storage/proxy_get?key=${encodeURIComponent(key)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!resp.ok) {
            alert('İndirme başarısız: ' + resp.status);
            return;
          }
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const name = (key.split('/').pop() || 'output.bin');
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }

        async function loadStats(){
          await ensureSession();
          const r = await fetch(`${api}/api/v1/jobs/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!r.ok) return;
          const s = await r.json();
          const pre = document.createElement('pre');
          pre.textContent = JSON.stringify(s, null, 2);
          document.getElementById('resultArea').innerHTML = '';
          document.getElementById('resultArea').appendChild(pre);
        }

        document.getElementById('btnSession').addEventListener('click', async ()=>{ await ensureSession(); ui(); });
        document.getElementById('btnUpload').addEventListener('click', doUpload);
        document.getElementById('btnStartJob').addEventListener('click', startJob);
        document.getElementById('btnStats').addEventListener('click', loadStats);
        document.getElementById('file').addEventListener('change', ui);
        document.getElementById('optBG').addEventListener('change', (e)=>{
          document.getElementById('presetBox').style.display = e.target.checked ? 'block' : 'none';
        });
        ui();
      </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
