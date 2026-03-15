from PIL import Image
from engine_core.utils.logger import log_info, log_success, log_error

def crop_image(input_path, output_path, ratio=(1, 1)):
    img = Image.open(input_path)
    w, h = img.size
    rw, rh = ratio
    new_w = int(min(w, h * rw / rh))
    new_h = int(new_w * rh / rw)
    left = (w - new_w) // 2
    top = (h - new_h) // 2
    right = left + new_w
    bottom = top + new_h
    log_info(f"Ratio crop: {ratio} → ({left}, {top}, {right}, {bottom})")
    cropped = img.crop((left, top, right, bottom))
    cropped.save(output_path)
    log_success(f"Ratio crop kaydedildi: {output_path}")
