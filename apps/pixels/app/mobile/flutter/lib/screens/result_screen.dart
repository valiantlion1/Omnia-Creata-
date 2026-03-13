import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class ResultScreen extends StatefulWidget {
  @override
  _ResultScreenState createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();
  
  Map<String, dynamic>? _jobData;
  File? _resultFile;
  bool _downloading = false;
  bool _downloaded = false;

  @override
  void initState() {
    super.initState();
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['jobData'] != null) {
        setState(() {
          _jobData = args['jobData'];
        });
        _downloadResult();
      }
    });
  }

  Future<void> _downloadResult() async {
    if (_jobData == null) return;

    setState(() {
      _downloading = true;
    });

    try {
      // Get latest job status with output URL
      final response = await _apiService.getJobStatus(_jobData!['job_id']);
      
      // Update job data with latest info
      setState(() {
        _jobData = response;
      });
      
      if (response['output_url'] != null && response['status'] == 'completed') {
        final file = await _storageService.downloadFile(
          response['output_url'],
          'result_${_jobData!['job_id']}.jpg',
        );
        
        setState(() {
          _resultFile = file;
          _downloaded = true;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to download result: $e')),
      );
    } finally {
      setState(() {
        _downloading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSuccess = _jobData?['status'] == 'completed';
    
    return Scaffold(
      appBar: AppBar(
        title: Text('Result'),
        centerTitle: true,
        actions: [
          if (_downloaded && _resultFile != null)
            IconButton(
              icon: Icon(Icons.share),
              onPressed: _shareResult,
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            _buildStatusHeader(isSuccess),
            SizedBox(height: 24),
            if (isSuccess) ...[
              _buildResultImage(),
              SizedBox(height: 24),
              _buildResultActions(),
            ] else
              _buildErrorCard(),
            SizedBox(height: 24),
            _buildJobDetails(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusHeader(bool isSuccess) {
    return Card(
      child: Container(
        width: double.infinity,
        padding: EdgeInsets.all(24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: isSuccess 
                ? [Colors.green, Colors.green.shade300]
                : [Colors.red, Colors.red.shade300],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Column(
          children: [
            Icon(
              isSuccess ? Icons.check_circle : Icons.error,
              size: 48,
              color: Colors.white,
            ),
            SizedBox(height: 12),
            Text(
              isSuccess ? 'Processing Complete!' : 'Processing Failed',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 8),
            Text(
              isSuccess 
                  ? 'Your image has been processed successfully'
                  : 'Something went wrong during processing',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white.withOpacity(0.9),
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultImage() {
    if (_downloading) {
      return Card(
        child: Container(
          height: 300,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Downloading result...'),
              ],
            ),
          ),
        ),
      );
    }

    if (_resultFile != null) {
      return Card(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Image.file(
            _resultFile!,
            width: double.infinity,
            height: 300,
            fit: BoxFit.cover,
          ),
        ),
      );
    }

    return Card(
      child: Container(
        height: 300,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.image, size: 48, color: Colors.grey),
              SizedBox(height: 16),
              Text('Result image not available'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultActions() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _downloaded ? _saveToGallery : null,
            icon: Icon(Icons.save_alt),
            label: Text('Save'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: _downloaded ? _shareResult : null,
            icon: Icon(Icons.share),
            label: Text('Share'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            onPressed: () => Navigator.pushNamedAndRemoveUntil(
              context,
              '/',
              (route) => false,
            ),
            icon: Icon(Icons.home),
            label: Text('Home'),
          ),
        ),
      ],
    );
  }

  Widget _buildErrorCard() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(20),
        child: Column(
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red),
            SizedBox(height: 16),
            Text(
              'Processing Error',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text(
              _jobData?['error'] ?? 'Unknown error occurred',
              style: TextStyle(color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.pushNamedAndRemoveUntil(
                context,
                '/',
                (route) => false,
              ),
              child: Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildJobDetails() {
    if (_jobData == null) return SizedBox.shrink();

    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Job Details',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 12),
            _buildDetailRow('Job ID', _jobData!['job_id'].toString()),
            _buildDetailRow('Type', _jobData!['processing_type'] ?? 'Unknown'),
            _buildDetailRow('Status', _jobData!['status'] ?? 'Unknown'),
            if (_jobData!['preset_name'] != null)
              _buildDetailRow('Preset', _jobData!['preset_name']),
            if (_jobData!['processing_time_ms'] != null)
              _buildDetailRow('Processing Time', '${_jobData!['processing_time_ms']}ms'),
            _buildDetailRow('Created', _formatDateTime(_jobData!['created_at'])),
            if (_jobData!['completed_at'] != null)
              _buildDetailRow('Completed', _formatDateTime(_jobData!['completed_at'])),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(String? dateTime) {
    if (dateTime == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateTime);
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTime;
    }
  }

  Future<void> _saveToGallery() async {
    // TODO: Implement save to gallery
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Save to gallery feature coming soon!')),
    );
  }

  Future<void> _shareResult() async {
    if (_resultFile != null) {
      await Share.shareXFiles([XFile(_resultFile!.path)]);
    }
  }
}
