import 'package:flutter/material.dart';
import 'dart:async';
import '../services/api_service.dart';

class ProcessingScreen extends StatefulWidget {
  @override
  _ProcessingScreenState createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen>
    with TickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  
  late AnimationController _progressController;
  late AnimationController _pulseController;
  
  Timer? _statusTimer;
  Map<String, dynamic>? _jobData;
  int? _jobId;
  double _progress = 0.0;
  String _status = 'pending';
  List<String> _logs = [];

  @override
  void initState() {
    super.initState();
    
    _progressController = AnimationController(
      duration: Duration(milliseconds: 500),
      vsync: this,
    );
    
    _pulseController = AnimationController(
      duration: Duration(seconds: 2),
      vsync: this,
    )..repeat();
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      if (args != null && args['jobId'] != null) {
        _jobId = args['jobId'];
        _startStatusPolling();
      }
    });
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _progressController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void _startStatusPolling() {
    _statusTimer = Timer.periodic(Duration(seconds: 2), (timer) async {
      if (_jobId != null) {
        try {
          final jobData = await _apiService.getJobStatus(_jobId!);
          setState(() {
            _jobData = jobData;
            _progress = (jobData['progress'] ?? 0.0).toDouble();
            _status = jobData['status'] ?? 'pending';
            _logs = List<String>.from(jobData['logs'] ?? []);
          });
          
          _progressController.animateTo(_progress);
          
          if (_status == 'completed' || _status == 'failed') {
            timer.cancel();
            _navigateToResult();
          }
        } catch (e) {
          // Handle error silently, continue polling
        }
      }
    });
  }

  void _navigateToResult() {
    Future.delayed(Duration(seconds: 1), () {
      Navigator.pushReplacementNamed(
        context,
        '/result',
        arguments: {'jobData': _jobData},
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Processing'),
        centerTitle: true,
        actions: [
          if (_status != 'completed' && _status != 'failed')
            IconButton(
              icon: Icon(Icons.cancel),
              onPressed: _cancelJob,
            ),
        ],
      ),
      body: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildProgressIndicator(),
            SizedBox(height: 32),
            _buildStatusCard(),
            SizedBox(height: 24),
            _buildLogsCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressIndicator() {
    return Column(
      children: [
        AnimatedBuilder(
          animation: _pulseController,
          builder: (context, child) {
            return Transform.scale(
              scale: 1.0 + (_pulseController.value * 0.1),
              child: Container(
                width: 120,
                height: 120,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: _progress,
                      strokeWidth: 8,
                      backgroundColor: Colors.grey.shade300,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        _getStatusColor(),
                      ),
                    ),
                    Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          _getStatusIcon(),
                          size: 32,
                          color: _getStatusColor(),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '${(_progress * 100).toInt()}%',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: _getStatusColor(),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
        SizedBox(height: 16),
        Text(
          _getStatusText(),
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: _getStatusColor(),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCard() {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: Colors.blue),
                SizedBox(width: 8),
                Text(
                  'Job Status',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 12),
            if (_jobData != null) ...[
              _buildStatusRow('Job ID', _jobData!['job_id'].toString()),
              _buildStatusRow('Type', _jobData!['processing_type'] ?? 'Unknown'),
              _buildStatusRow('Status', _status.toUpperCase()),
              if (_jobData!['eta_seconds'] != null)
                _buildStatusRow('ETA', '${_jobData!['eta_seconds']}s'),
            ] else
              Text('Loading job information...'),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildLogsCard() {
    if (_logs.isEmpty) return SizedBox.shrink();
    
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.list_alt, color: Colors.green),
                SizedBox(width: 8),
                Text(
                  'Processing Logs',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            SizedBox(height: 12),
            Container(
              height: 100,
              child: ListView.builder(
                itemCount: _logs.length,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '• ${_logs[index]}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor() {
    switch (_status) {
      case 'completed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      case 'processing':
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  IconData _getStatusIcon() {
    switch (_status) {
      case 'completed':
        return Icons.check_circle;
      case 'failed':
        return Icons.error;
      case 'processing':
        return Icons.settings;
      default:
        return Icons.hourglass_empty;
    }
  }

  String _getStatusText() {
    switch (_status) {
      case 'completed':
        return 'Processing Complete!';
      case 'failed':
        return 'Processing Failed';
      case 'processing':
        return 'Processing Image...';
      case 'pending':
        return 'Waiting in Queue...';
      default:
        return 'Unknown Status';
    }
  }

  Future<void> _cancelJob() async {
    if (_jobId == null) return;
    
    try {
      await _apiService.cancelJob(_jobId!);
      Navigator.pop(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to cancel job: $e')),
      );
    }
  }
}
