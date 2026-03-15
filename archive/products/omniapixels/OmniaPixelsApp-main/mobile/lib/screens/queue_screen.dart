import 'package:flutter/material.dart';

class QueueScreen extends StatelessWidget {
  const QueueScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Processing Queue'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: 2,
          separatorBuilder: (context, index) => const SizedBox(height: 16),
          itemBuilder: (context, index) {
            bool isComplete = index == 1; // dummy logic
            
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Job #${200 + index}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isComplete ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isComplete ? 'Completed' : 'Processing (45%)',
                            style: TextStyle(
                              color: isComplete ? Colors.green : Colors.orange,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        )
                      ],
                    ),
                    const SizedBox(height: 16),
                    LinearProgressIndicator(
                      value: isComplete ? 1.0 : 0.45,
                      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                      color: isComplete ? Colors.green : Colors.orange,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      isComplete ? 'Ready to download' : 'Applying 4x Upscale...',
                      style: Theme.of(context).textTheme.bodyMedium,
                    )
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
