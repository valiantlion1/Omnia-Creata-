import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as p;

class StorageService {
  Future<File> downloadFile(String url, String filename) async {
    final dir = await getTemporaryDirectory();
    final file = File(p.join(dir.path, filename));
    final res = await http.get(Uri.parse(url));
    await file.writeAsBytes(res.bodyBytes);
    return file;
  }
}
