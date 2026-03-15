# engine_core/logger_test.py

from utils.logger import (
    log_info,
    log_success,
    log_warning,
    log_error,
    log_debug,
    get_log_file_path,
    clear_log_file
)

def test_logger():
    clear_log_file()
    print("\n--- OMNIA LOGGER TEST BAŞLIYOR ---\n")
    
    log_info("Sistem başlatıldı.")
    log_success("Veritabanı bağlantısı başarılı.")
    log_warning("GPU belleği düşük.")
    log_error("Model yüklenemedi!")
    log_debug("Gizli hata ayıklama mesajı.")
    
    print("\n✔️  Tüm loglar başarıyla üretildi.")
    print(f"📄  Log dosyası: {get_log_file_path()}\n")

if __name__ == "__main__":
    test_logger()
