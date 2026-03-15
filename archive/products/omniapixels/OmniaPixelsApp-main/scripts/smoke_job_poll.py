import os, json, time, uuid, requests

API_BASE = os.getenv('API_BASE_URL', 'http://localhost:8000')
PROOF_DIR = os.path.join('proof', 'backend')
os.makedirs(PROOF_DIR, exist_ok=True)

LOG_PATH = os.path.join(PROOF_DIR, 'job_poll.log')
RESULT_PATH = os.path.join(PROOF_DIR, 'job_poll_result.json')

session = requests.Session()

def log(msg):
    print(msg)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(msg + "\n")
    except Exception:
        pass


def login_or_register():
    email = f"job_{uuid.uuid4().hex[:8]}@example.com"
    password = "Test1234!"
    r = session.post(f"{API_BASE}/auth/register", json={"email": email, "password": password}, timeout=10)
    if r.status_code not in (200, 201):
        email = os.getenv('TEST_EMAIL', 'tester@example.com')
        password = os.getenv('TEST_PASSWORD', 'Tester123!')
    r = session.post(f"{API_BASE}/auth/login", json={"email": email, "password": password}, timeout=10)
    r.raise_for_status()
    token = r.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    log(f"AUTH_OK email={email}")


def enqueue_and_poll():
    # Use the object uploaded by first smoke if exists
    presigned_json = os.path.join(PROOF_DIR, 'presigned_result.json')
    if os.path.exists(presigned_json):
        with open(presigned_json, 'r', encoding='utf-8') as f:
            key = json.load(f)["key"]
    else:
        key = "raw/smoke_input.txt"  # fallback
    payload = {
        "queue": "image_processing",
        "input_key": key,
        "params": {"op": "echo", "note": "smoke"}
    }
    r = session.post(f"{API_BASE}/api/v1/jobs/", json=payload, timeout=15)
    log(f"JOB_CREATE_STATUS {r.status_code}")
    r.raise_for_status()
    job = r.json()
    job_id = job["id"]
    log(f"JOB_ID {job_id}")

    for i in range(60):
        time.sleep(1)
        g = session.get(f"{API_BASE}/api/v1/jobs/id/{job_id}", timeout=10)
        if g.status_code != 200:
            log(f"JOB_GET_STATUS {g.status_code}")
            continue
        jd = g.json()
        status = jd["status"]
        log(f"POLL {i} STATUS {status}")
        if status in ("completed", "failed"):
            with open(RESULT_PATH, 'w', encoding='utf-8') as rf:
                json.dump(jd, rf, indent=2)
            return status, jd
    return "timeout", None


def main():
    login_or_register()
    status, jd = enqueue_and_poll()
    log(f"FINAL_STATUS {status}")

if __name__ == '__main__':
    main()
