import 'package:image_picker/image_picker.dart';

class ImageService {
  final ImagePicker _picker = ImagePicker();

  Future<XFile?> pickImageFromGallery() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
      return image;
    } catch (e) {
      print("Error picking image from gallery: $e");
      return null;
    }
  }

  Future<XFile?> takeImageWithCamera() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.camera);
      return image;
    } catch (e) {
      print("Error picking image from camera: $e");
      return null;
    }
  }
}
