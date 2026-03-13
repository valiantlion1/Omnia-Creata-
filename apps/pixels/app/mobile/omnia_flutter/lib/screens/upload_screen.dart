import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class UploadScreen extends StatefulWidget {
  @override
  _UploadScreenState createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();
  
  File? _selectedFile;
  String? _selectedPreset;
  String _processingType = 'enhance';
  bool _uploading = false;
  
  final List<Map<String, dynamic>> _processingTypes = [
    {'value': 'background_removal', 'label': 'Remove Background', 'icon': Icons.auto_fix_high},
    {'value': 'enhance', 'label': 'Enhance Image', 'icon': Icons.tune},
    {'value': 'super_resolution', 'label': 'Super Resolution', 'icon': Icons.zoom_in},
    {'value': 'crop', 'label': 'Smart Crop', 'icon': Icons.crop},
    {'value': 'style_transfer', 'label': 'Style Transfer', 'icon': Icons.palette},
  ];

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && args['type'] != null) {
      _processingType = args['type'];
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Upload Image'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildFileSelector(),
            SizedBox(height: 24),
            _buildProcessingTypeSelector(),
            SizedBox(height: 24),
            _buildPresetSelector(),
            SizedBox(height: 32),
            _buildProcessButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildFileSelector() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Select Image',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            if (_selectedFile != null) ...[
              Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.file(
                    _selectedFile!,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              SizedBox(height: 12),
              Text(
                'File: ${_selectedFile!.path.split('/').last}',
                style: TextStyle(color: Colors.grey[600]),
              ),
              SizedBox(height: 16),
            ],
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _pickFromCamera,
                    icon: Icon(Icons.camera_alt),
                    label: Text('Camera'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _pickFromGallery,
                    icon: Icon(Icons.photo_library),
                    label: Text('Gallery'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProcessingTypeSelector() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Processing Type',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _processingTypes.map((type) {
                final isSelected = _processingType == type['value'];
                return FilterChip(
                  selected: isSelected,
                  label: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        type['icon'] as IconData,
                        size: 16,
                        color: isSelected ? Colors.white : Colors.grey[600],
                      ),
                      SizedBox(width: 4),
                      Text(type['label']),
                    ],
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _processingType = type['value'];
                        _selectedPreset = null; // Reset preset
                      });
                    }
                  },
                  selectedColor: Colors.deepPurple,
                  checkmarkColor: Colors.white,
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetSelector() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Preset (Optional)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            DropdownButtonFormField<String>(
              value: _selectedPreset,
              decoration: InputDecoration(
                hintText: 'Choose a preset',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              items: _getPresetsForType().map((preset) {
                return DropdownMenuItem<String>(
                  value: preset,
                  child: Text(preset),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _selectedPreset = value;
                });
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProcessButton() {
    final canProcess = _selectedFile != null && !_uploading;
    
    return Container(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: canProcess ? _processImage : null,
        style: ElevatedButton.styleFrom(
          padding: EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: _uploading
            ? Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                  SizedBox(width: 12),
                  Text('Processing...'),
                ],
              )
            : Text(
                'Start Processing',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
      ),
    );
  }

  List<String> _getPresetsForType() {
    // Mock presets based on processing type
    switch (_processingType) {
      case 'background_removal':
        return ['Clean Removal', 'Soft Edges', 'High Precision'];
      case 'enhance':
        return ['Auto Enhance', 'Portrait Mode', 'Landscape Mode'];
      case 'super_resolution':
        return ['2x Upscale', '4x Upscale', 'Photo Restore'];
      case 'crop':
        return ['Smart Crop', 'Portrait Crop', 'Square Crop'];
      case 'style_transfer':
        return ['Artistic', 'Vintage', 'Modern'];
      default:
        return [];
    }
  }

  Future<void> _pickFromCamera() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera);
    
    if (pickedFile != null) {
      setState(() {
        _selectedFile = File(pickedFile.path);
      });
    }
  }

  Future<void> _pickFromGallery() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.image,
      allowMultiple: false,
    );
    
    if (result != null && result.files.single.path != null) {
      setState(() {
        _selectedFile = File(result.files.single.path!);
      });
    }
  }

  Future<void> _processImage() async {
    if (_selectedFile == null) return;

    setState(() {
      _uploading = true;
    });

    try {
      // Get upload URL
      final filename = _selectedFile!.path.split('/').last;
      final uploadData = await _apiService.getUploadUrl(filename);
      
      // Upload file
      await _storageService.uploadFile(_selectedFile!, uploadData['upload_url']);
      
      // Create job
      final jobData = await _apiService.createJob(
        processingType: _processingType,
        inputKey: uploadData['key'],
        presetName: _selectedPreset,
      );

      // Navigate to processing screen
      Navigator.pushReplacementNamed(
        context,
        '/processing',
        arguments: {'jobId': jobData['job_id']},
      );

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Upload failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        _uploading = false;
      });
    }
  }
}
