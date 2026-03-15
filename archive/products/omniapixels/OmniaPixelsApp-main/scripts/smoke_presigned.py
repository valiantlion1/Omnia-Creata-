import os, json, time, uuid
from urllib.parse import urlparse, urlunparse
import requests

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:8000')
PROOF_DIR = os.path.join('proof', 'backend')
os.makedirs(PROOF_DIR, exist_ok=True)

LOG_PATH = os.path.join(PROOF_DIR, 'minio_presigned.log')
JSON_PATH = os.path.join(PROOF_DIR, 'presigned_result.json')
DL_PATH = os.path.join(PROOF_DIR, 'minio_download.txt')

session = requests.Session()

def log(msg):
    print(msg)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(msg + "\n")
    except Exception:
        pass


def login_or_register():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "Test1234!"
    # try register
    r = session.post(f"{API_BASE}/auth/register", json={"email": email, "password": password}, timeout=10)
    if r.status_code not in (200, 201):
        # If already exists (shouldn't), fallback to login with a default tester
        email = os.getenv('TEST_EMAIL', 'tester@example.com')
        password = os.getenv('TEST_PASSWORD', 'Tester123!')
    r = session.post(f"{API_BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    r.raise_for_status()
    token = r.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    log(f"AUTH_OK email={email}")


def reroute_url(original_url: str) -> tuple[str, dict]:
    """Route to localhost:9000 but preserve original Host header for valid signature."""
    p = urlparse(original_url)
    # keep scheme as http since local MinIO is http
    new_netloc = "127.0.0.1:9000"
    new_url = urlunparse(("http", new_netloc, p.path, p.params, p.query, p.fragment))
    headers = {"Host": p.netloc}
    return new_url, headers


def main():
    try:
        login_or_register()
        # Request presigned PUT/GET pair
        body = {"path_hint": "smoke_input.txt", "content_type": "text/plain"}
        r = session.post(f"{API_BASE}/storage/presigned_put", json=body, timeout=15)
        log(f"PRESIGNED_PUT_STATUS {r.status_code}")
        r.raise_for_status()
        data = r.json()
        upload_url = data["upload_url"]
        key = data["key"]
        download_url = data.get("download_url")
        with open(JSON_PATH, 'w', encoding='utf-8') as jf:
            json.dump({"key": key, "upload_url": upload_url, "download_url": download_url}, jf, indent=2)
        log(f"KEY {key}")
        # Upload content using reroute trick
        payload = b"hello from smoke_presigned"  
        put_url, put_hdr = reroute_url(upload_url)
        put_hdr["Content-Type"] = "text/plain"
        pr = requests.put(put_url, data=payload, headers=put_hdr, timeout=20)
        log(f"PUT_MINIO_STATUS {pr.status_code}")
        # Try GET presigned
        gr = session.post(f"{API_BASE}/storage/presigned_get", json={"key": key}, timeout=15)
        log(f"PRESIGNED_GET_STATUS {gr.status_code}")
        gr.raise_for_status()
        g_url = gr.json()["download_url"]
        get_url, get_hdr = reroute_url(g_url)
        dr = requests.get(get_url, headers=get_hdr, timeout=20)
        log(f"GET_MINIO_STATUS {dr.status_code}")
        if dr.ok:
            with open(DL_PATH, 'wb') as df:
                df.write(dr.content)
            log(f"DOWNLOADED_BYTES {len(dr.content)} -> {DL_PATH}")
        log("DONE_SMOKE_PRESIGNED")
    except Exception as e:
        log(f"ERROR {e}")
        raise


if __name__ == "__main__":
    main()
