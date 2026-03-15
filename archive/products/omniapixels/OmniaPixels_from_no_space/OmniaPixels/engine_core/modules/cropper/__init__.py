# engine_core/modules/cropper/__init__.py

from .manual_cropper import crop_image as manual_crop

def crop_dispatcher(
    input_path: str,
    output_path: str,
    mode: str = "manual",
    **kwargs
) -> bool:
    """
    Tüm crop türlerini yöneten merkezi fonksiyon.
    """
    if mode == "manual":
        return manual_crop(input_path, output_path, mode="manual", **kwargs)

    elif mode == "ratio":
        return manual_crop(input_path, output_path, mode="ratio", **kwargs)

    # İleride eklenecek diğer sistemler
    elif mode == "face":
        from .face_cropper import crop_face
        return crop_face(input_path, output_path, **kwargs)

    elif mode == "object":
        from .object_cropper import crop_object
        return crop_object(input_path, output_path, **kwargs)

    elif mode == "smart":
        from .smart_cropper import crop_smart
        return crop_smart(input_path, output_path, **kwargs)

    else:
        from utils.logger import log_error
        log_error(f"Geçersiz crop mode: {mode}")
        return False
