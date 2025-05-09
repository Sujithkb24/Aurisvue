import 'package:flutter/material.dart';
import 'package:model_viewer_plus/model_viewer_plus.dart';
import 'dart:async';

class ISLViewer extends StatefulWidget {
  final bool darkMode;
  final String speechInput;
  final bool isListening;
  final bool shouldTranslate;
  final Function onTranslationDone;
  
  const ISLViewer({
    super.key,
    required this.darkMode,
    required this.speechInput,
    required this.isListening,
    required this.shouldTranslate,
    required this.onTranslationDone,
  });

  @override
  State<ISLViewer> createState() => _ISLViewerState();
}

class _ISLViewerState extends State<ISLViewer> {
  bool _isAnimating = false;
  String _currentGesture = 'IDLE';
  
  @override
  void didUpdateWidget(ISLViewer oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    if (widget.shouldTranslate && !oldWidget.shouldTranslate) {
      _startAnimation();
    }
  }
  
  void _startAnimation() {
    setState(() {
      _isAnimating = true;
    });
    
    // Simulate animation sequence with different gestures
    _simulateGestureSequence(widget.speechInput);
  }
  
  // This simulates what would actually happen with a real ISL model
  void _simulateGestureSequence(String text) {
    List<String> words = text.split(' ');
    int wordIndex = 0;
    
    // Simple timer to cycle through "gestures" for each word
    Timer.periodic(Duration(milliseconds: 800), (timer) {
      if (wordIndex < words.length) {
        setState(() {
          _currentGesture = words[wordIndex];
        });
        wordIndex++;
      } else {
        timer.cancel();
        setState(() {
          _isAnimating = false;
          _currentGesture = 'IDLE';
        });
        widget.onTranslationDone();
      }
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          height: double.infinity,
          width: double.infinity,
          color: widget.darkMode ? Colors.black45 : Colors.transparent,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  height: 300,
                  width: 300,
                  decoration: BoxDecoration(
                    color: widget.darkMode ? Colors.grey[900] : Colors.grey[200],
                    borderRadius: BorderRadius.circular(20),
                  ),
                  // In a real app, you would use a 3D model or avatar here
                  // This is a placeholder that could be replaced with actual 3D content
                  child: ModelViewer(
                    backgroundColor: widget.darkMode ? const Color(0xFF121212) : const Color(0xFFF0F0F0),
                    src: 'assets/models/avatar.glb', // You'd need to include this 3D model file
                    alt: 'A 3D ISL avatar',
                    autoRotate: false,
                    disableZoom: true,
                  ),
                ),
                const SizedBox(height: 20),
                if (_isAnimating) 
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: widget.darkMode ? Colors.grey[800] : Colors.grey[300],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      'Signing: $_currentGesture',
                      style: TextStyle(
                        fontSize: 16,
                        color: widget.darkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        
        // Microphone indicator
        if (widget.isListening)
          Positioned(
            top: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.8),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Listening',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}