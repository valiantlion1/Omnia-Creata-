# engine_core/tests/test_cropper.py

from engine_core.modules.cropper import crop_dispatcher
from engine_core.utils.logger import log_info, log_success, log_error
import os

def run_all_tests():
    log_info("🔍 Cropper modülleri test ediliyor...")

    input_path = os.path.join("engine_core", "assets", "test_image.jpg")

    tests = [
        {"mode": "manual", "output": "crop_manual.jpg", "kwargs": {"coords": (100, 100, 500, 500)}},
        {"mode": "ratio", "output": "crop_ratio.jpg", "kwargs": {"ratio": (4, 3)}},
        {"mode": "face", "output": "crop_face.jpg", "kwargs": {}},
        {"mode": "object", "output": "crop_object.jpg", "kwargs": {}},
        {"mode": "smart", "output": "crop_smart.jpg", "kwargs": {}},
    ]

    for test in tests:
        out_file = os.path.join("engine_core", "assets", test["output"])
        crop_dispatcher(
            input_path=input_path,
            output_path=out_file,
            mode=test["mode"],
            **test["kwargs"]
        )

if __name__ == "__main__":
    run_all_tests()
