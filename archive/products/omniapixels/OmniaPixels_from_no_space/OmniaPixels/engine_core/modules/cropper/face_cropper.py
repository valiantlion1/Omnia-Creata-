import cv2
from engine_core.utils.logger import log_info, log_success, log_error

def crop_image(input_path, output_path):
    log_info("Face crop başlatılıyor...")
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    img = cv2.imread(input_path)
    if img is None:
        log_info("Görsel yüklenemedi.")
        return
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(faces) == 0:
        log_info("Yüz bulunamadı.")
        return
    (x, y, w, h) = faces[0]
    cropped = img[y:y+h, x:x+w]
    cv2.imwrite(output_path, cropped)
    log_success(f"Yüz kırpıldı ve kaydedildi: {output_path}")
