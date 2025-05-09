import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:intl/intl.dart';

class TranscriptItem {
  final String text;
  final String timestamp;
  
  TranscriptItem({required this.text, required this.timestamp});
}

class SpeechProvider with ChangeNotifier {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  String _detectedSpeech = '';
  bool _isTranslating = false;
  List<TranscriptItem> _transcriptHistory = [];

  bool get isListening => _isListening;
  String get detectedSpeech => _detectedSpeech;
  bool get isTranslating => _isTranslating;
  List<TranscriptItem> get transcriptHistory => _transcriptHistory;

  SpeechProvider() {
    _initSpeech();
  }

  // Initialize speech recognition
  Future<void> _initSpeech() async {
    await _speech.initialize(
      onStatus: (status) {
        if (status == 'notListening') {
          _isListening = false;
          notifyListeners();
        }
      },
      onError: (errorNotification) {
        print('Speech recognition error: $errorNotification');
        _isListening = false;
        notifyListeners();
      },
    );
  }

  // Start listening for speech
  Future<void> startListening() async {
    if (!_speech.isAvailable) {
      await _initSpeech();
    }

    if (!_isListening && await _speech.initialize()) {
      _isListening = true;
      _detectedSpeech = '';
      
      await _speech.listen(
        onResult: (result) {
          _detectedSpeech = result.recognizedWords;
          notifyListeners();
        },
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
        partialResults: true,
        cancelOnError: true,
        listenMode: stt.ListenMode.confirmation,
      );
      
      notifyListeners();
    }
  }

  // Stop listening for speech
  void stopListening() {
    if (_isListening) {
      _speech.stop();
      _isListening = false;
      
      // Add to history if speech was detected
      if (_detectedSpeech.trim().isNotEmpty) {
        _addToHistory(_detectedSpeech);
      }
      
      notifyListeners();
    }
  }

  // Start translating the detected speech
  void startTranslating() {
    if (_detectedSpeech.trim().isEmpty) return;
    
    _isTranslating = true;
    notifyListeners();
  }

  // Stop translating
  void stopTranslating() {
    _isTranslating = false;
    notifyListeners();
  }

  // Clear the detected speech
  void clearSpeech() {
    _detectedSpeech = '';
    notifyListeners();
  }

  // Add current speech to history
  void _addToHistory(String speech) {
    if (speech.trim().isEmpty) return;
    
    final now = DateTime.now();
    final formattedTime = DateFormat('HH:mm').format(now);
    
    _transcriptHistory.insert(
      0,  // Insert at beginning to show most recent first
      TranscriptItem(text: speech, timestamp: formattedTime),
    );
    
    notifyListeners();
  }

  // Clear history
  void clearHistory() {
    _transcriptHistory.clear();
    notifyListeners();
  }
}