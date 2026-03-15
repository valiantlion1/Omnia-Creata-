# engine_core/modules/cropper/manual_cropper.py

from PIL import Image
import os
import time
from engine_core.utils.logger import log_info, log_success, log_error

def crop_image(
    input_path,
    output_path,
    mode="manual",
    coords=None,
    ratio=(1, 1),
    output_format="JPEG",
    resize_to=None
):
    start = time.time()
    log_info(f"Crop başlatıldı: {input_path}")

    if not os.path.exists(input_path):
        log_error("Giriş dosyası bulunamadı.")
        return False

    try:
        img = Image.open(input_path)
        w, h = img.size
        log_info(f"Görsel boyutu: {w}x{h} px")

        if mode == "manual" and coords:
            log_info(f"Manuel crop koordinatları: {coords}")
            cropped = img.crop(coords)
            cw, ch = cropped.size
            log_info(f"Kırpılan alan boyutu: {cw}x{ch} px")

        elif mode == "ratio":
            rw, rh = ratio
            target_w = int(w * rw)
            target_h = int(h * rh)
            left = (w - target_w) // 2
            top = (h - target_h) // 2
            right = left + target_w
            bottom = top + target_h
            log_info(f"Oranlı crop: {rw}:{rh} → ({left}, {top}, {right}, {bottom})")
            cropped = img.crop((left, top, right, bottom))
            cw, ch = cropped.size
            log_info(f"Kırpılan oran alanı: {cw}x{ch} px")

        else:
            log_error("Geçersiz mod veya parametre.")
            return False

        if resize_to:
            cropped = cropped.resize(resize_to)
            log_info(f"Görsel yeniden boyutlandırıldı: {resize_to[0]}x{resize_to[1]} px")

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        cropped.save(output_path, format=output_format.upper())

        elapsed = round(time.time() - start, 2)
        log_success(f"Crop tamamlandı → {output_path} ({elapsed} sn)")
        return True

    except Exception as e:
        log_error(f"Crop hatası: {str(e)}")
        return False
