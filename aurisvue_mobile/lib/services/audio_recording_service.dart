import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

class AudioRecordingService {
  final _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  String? _recordingPath;

  bool get isRecording => _isRecording;
  String? get recordingPath => _recordingPath;

  Future<void> startRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        final directory = await getTemporaryDirectory();
        _recordingPath = '${directory.path}/audio_recording.m4a';
        
        await _audioRecorder.start(
          RecordConfig(
            encoder: AudioEncoder.aacHe,
            bitRate: 128000,
            sampleRate: 44100,
          ),
          path: _recordingPath!,
        );
        
        _isRecording = true;
      }
    } catch (e) {
      debugPrint('Error starting recording: $e');
      _isRecording = false;
    }
  }

  Future<String?> stopRecording() async {
    try {
      if (!_isRecording) return null;
      
      await _audioRecorder.stop();
      _isRecording = false;
      
      return _recordingPath;
    } catch (e) {
      debugPrint('Error stopping recording: $e');
      _isRecording = false;
      return null;
    }
  }

  Future<void> dispose() async {
    await _audioRecorder.dispose();
  }
}