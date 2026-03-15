import cv2
from engine_core.utils.logger import log_info, log_success, log_error

def crop_image(input_path, output_path):
    log_info("Nesne crop başlatılıyor...")
    img = cv2.imread(input_path)
    if img is None:
        log_info("Görsel yüklenemedi.")
        return
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    _, thresh = cv2.threshold(blurred, 60, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        log_info("Nesne bulunamadı.")
        return
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    cropped = img[y:y+h, x:x+w]
    cv2.imwrite(output_path, cropped)
    log_success(f"Nesne kırpıldı ve kaydedildi: {output_path}")
