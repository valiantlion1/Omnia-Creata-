from PIL import Image
from engine_core.utils.logger import log_info, log_success, log_error

def crop_image(input_path, output_path):
    log_info("Akıllı crop başlatılıyor...")
    img = Image.open(input_path)
    w, h = img.size
    crop_box = (
        int(w * 0.2),
        int(h * 0.2),
        int(w * 0.8),
        int(h * 0.8)
    )
    log_info(f"Smart crop bölgesi: {crop_box}")
    cropped = img.crop(crop_box)
    cropped.save(output_path)
    log_success(f"Smart crop kaydedildi: {output_path}")
