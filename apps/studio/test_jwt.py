import os
import sys

# Keep this file as a manual auth probe, but never execute at import time.
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.main import app
from fastapi.testclient import TestClient


def main() -> None:
    client = TestClient(app)
    response = client.get("/v1/auth/me", headers={"Authorization": "Bearer fake_token"})
    print("STATUS:", response.status_code)
    print("BODY:", response.text)


if __name__ == "__main__":
    main()
