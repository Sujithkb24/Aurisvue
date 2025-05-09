import 'dart:typed_data';

import 'package:aurisvue_mobile/services/isl_serivce.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';
import 'dart:developer';

class ISLViewerScreen extends StatefulWidget {
  final String speechInput;
  final bool darkMode;
  final bool shouldTranslate;
  final Function? onTranslationDone;

  const ISLViewerScreen({
    super.key,
    required this.speechInput,
    required this.darkMode,
    required this.shouldTranslate,
    this.onTranslationDone,
  });

  @override
  // ignore: library_private_types_in_public_api
  _ISLViewerScreenState createState() => _ISLViewerScreenState();
}

class _ISLViewerScreenState extends State<ISLViewerScreen> with SingleTickerProviderStateMixin {
  List<String> videoSequence = [];
  int currentIndex = 0;
  bool isPlaying = true;
  bool loading = false;
  bool assetCheckCompleted = false;
  VideoPlayerController? _controller;
  late AnimationController _animationController;
  double _playbackSpeed = 1.0;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    processLocalVideos();
  }

  @override
  void dispose() {
    _controller?.dispose();
    _animationController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(ISLViewerScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Check if translation needed
    if (widget.shouldTranslate &&
        widget.speechInput.trim().isNotEmpty &&
        (widget.shouldTranslate != oldWidget.shouldTranslate ||
            widget.speechInput != oldWidget.speechInput)) {
      processLocalVideos();
    }
  }

  Future<void> checkVideoAssets() async {
    try {
      // Test a few common letter videos
      List<String> testVideos = ['A.mp4', 'H.mp4', 'E.mp4', 'L.mp4', 'O.mp4'];

      for (String video in testVideos) {
        String assetPath = 'assets/videos/$video';
        try {
          final ByteData data = await rootBundle.load(assetPath);
          log('Asset verified: $assetPath (${data.lengthInBytes} bytes)');
        } catch (e) {
          log('Asset not found: $assetPath');
        }
      }
      assetCheckCompleted = true;
    } catch (e) {
      log('Error checking assets: $e');
    }
  }

  Future<void> processLocalVideos() async {
    if (!widget.shouldTranslate || widget.speechInput.trim().isEmpty) {
      log('ISLViewerScreen: No translation requested or empty speech');
      return;
    }

    log('ISLViewerScreen: Processing videos for: "${widget.speechInput}"');
    setState(() {
      loading = true;
    });

    try {
      // Get translation from ISL service
      final islService = ISLService();
      final translationResponse = await islService.translateToISL(
        widget.speechInput,
      );
      log('ISLViewerScreen: Translation response: $translationResponse');

      // Extract video filenames from the response
      List<dynamic> videoFilenames = translationResponse['videos'] ?? [];
      log('ISLViewerScreen: Video filenames: $videoFilenames');

      if (videoFilenames.isEmpty) {
        log('ISLViewerScreen: No videos returned from translation');
        setState(() {
          loading = false;
        });
        return;
      }

      // Convert to asset paths
      final availableVideos =
          videoFilenames
              .map<String>(
                (filename) => 'assets/videos/${filename.replaceAll(' ', '_')}',
              )
              .toList();

      log('ISLViewerScreen: Asset paths: $availableVideos');

      setState(() {
        videoSequence = List<String>.from(availableVideos);
        currentIndex = 0;
        isPlaying = true;
      });

      // Initialize the first video player
      await initializeVideoPlayer(videoSequence[currentIndex]);

      if (widget.onTranslationDone != null) {
        widget.onTranslationDone!();
      }
    } catch (error) {
      log('ISLViewerScreen: Error processing videos: $error');
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  Future<void> initializeVideoPlayer(String videoPath) async {
    log('ISLViewerScreen: Initializing player with: $videoPath');

    // Dispose previous controller if exists
    if (_controller != null) {
      await _controller!.dispose();
    }

    try {
      // Create new controller
      _controller = VideoPlayerController.asset(videoPath);

      // Initialize and set up listener
      await _controller!.initialize();
      log('ISLViewerScreen: Video initialized successfully');

      // Set playback speed
      await _controller!.setPlaybackSpeed(_playbackSpeed);

      _controller!.addListener(() {
        if (_controller!.value.isInitialized &&
            _controller!.value.position >= _controller!.value.duration &&
            _controller!.value.position.inMilliseconds > 0) {
          log(
            'ISLViewerScreen: Video ended, position: ${_controller!.value.position}, duration: ${_controller!.value.duration}',
          );
          handleVideoEnd();
        }
      });

      // Start playing if needed
      if (mounted) {
        setState(() {});
        if (isPlaying) {
          await _controller!.play();
          _animationController.forward();
        }
      }
    } catch (e) {
      log('ISLViewerScreen: Error initializing video: $e');
    }
  }

  void handleVideoEnd() {
    if (currentIndex < videoSequence.length - 1) {
      setState(() {
        currentIndex++;
      });
      log(
        'ISLViewerScreen: Moving to next video: ${videoSequence[currentIndex]}',
      );
      initializeVideoPlayer(videoSequence[currentIndex]);
    } else {
      log('ISLViewerScreen: Reached end of video sequence');
    }
  }

  void togglePlayPause() {
    if (_controller == null) return;

    setState(() {
      isPlaying = !isPlaying;
    });

    if (isPlaying) {
      _controller!.play();
      _animationController.forward();
    } else {
      _controller!.pause();
      _animationController.reverse();
    }
  }

  void handlePrev() {
    if (currentIndex > 0) {
      setState(() {
        currentIndex -= 1;
        isPlaying = true;
      });
      _animationController.forward();
      initializeVideoPlayer(videoSequence[currentIndex]);
    }
  }

  void handleNext() {
    if (currentIndex < videoSequence.length - 1) {
      setState(() {
        currentIndex += 1;
        isPlaying = true;
      });
      _animationController.forward();
      initializeVideoPlayer(videoSequence[currentIndex]);
    }
  }

  void changePlaybackSpeed() {
    // Cycle through speeds: 0.5 -> 1.0 -> 1.5 -> 2.0 -> 0.5
    List<double> speeds = [0.5, 1.0, 1.5, 2.0];
    int currentSpeedIndex = speeds.indexOf(_playbackSpeed);
    int nextSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
    
    setState(() {
      _playbackSpeed = speeds[nextSpeedIndex];
    });
    
    if (_controller != null) {
      _controller!.setPlaybackSpeed(_playbackSpeed);
    }
  }

  String formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String twoDigitMinutes = twoDigits(duration.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(duration.inSeconds.remainder(60));
    return "$twoDigitMinutes:$twoDigitSeconds";
  }

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: CircularProgressIndicator(
                color: widget.darkMode ? Colors.blue[400] : Colors.blue[600],
                strokeWidth: 3,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Translating to ISL...',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w500,
                color: widget.darkMode ? Colors.white : Colors.black87,
              ),
            ),
          ],
        ),
      );
    }

    if (videoSequence.isEmpty) {
      return const SizedBox.shrink(); // Empty widget when no videos
    }

    final Color primaryColor = widget.darkMode ? Colors.blue[400]! : Colors.blue[700]!;
    final Color accentColor = widget.darkMode ? Colors.teal[300]! : Colors.teal[600]!;
    final Color backgroundColor = widget.darkMode ? Colors.grey[850]! : Colors.white;
    final Color textColor = widget.darkMode ? Colors.white : Colors.black87;
    final Color secondaryTextColor = widget.darkMode ? Colors.grey[400]! : Colors.grey[600]!;

    Duration? currentPosition = _controller?.value.position;
    Duration? totalDuration = _controller?.value.duration;
    double progress = 0.0;
    
    if (currentPosition != null && totalDuration != null && totalDuration.inMilliseconds > 0) {
      progress = currentPosition.inMilliseconds / totalDuration.inMilliseconds;
    }

    return Container(
      constraints: const BoxConstraints(maxWidth: 480),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: widget.darkMode ? Colors.grey[700]! : Colors.grey[300]!,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.25),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header bar with title
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: primaryColor.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.sign_language_rounded,
                  color: primaryColor,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Text(
                  'ISL Translation',
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 18,
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.speed,
                        color: accentColor,
                        size: 16,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${_playbackSpeed}x',
                        style: TextStyle(
                          color: accentColor,
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Video player
          ClipRRect(
            borderRadius: const BorderRadius.only(
              bottomLeft: Radius.circular(4),
              bottomRight: Radius.circular(4),
            ),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Video player
                  _controller != null && _controller!.value.isInitialized
                      ? Container(
                          color: Colors.black,
                          child: VideoPlayer(_controller!),
                        )
                      : Container(
                          color: Colors.black,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: primaryColor,
                            ),
                          ),
                        ),

                  // Overlay for play/pause control
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: togglePlayPause,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.black.withOpacity(0.4),
                              Colors.transparent,
                              Colors.black.withOpacity(0.4),
                            ],
                          ),
                        ),
                        child: Center(
                          child: AnimatedOpacity(
                            opacity: 1.0,
                            duration: const Duration(milliseconds: 300),
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: primaryColor.withOpacity(0.8),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.5),
                                    blurRadius: 15,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: AnimatedIcon(
                                icon: AnimatedIcons.play_pause,
                                progress: _animationController,
                                size: 32,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Time indicator and video progress
          if (_controller != null && _controller!.value.isInitialized)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Text(
                    formatDuration(currentPosition ?? Duration.zero),
                    style: TextStyle(
                      fontSize: 12,
                      color: secondaryTextColor,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ProgressBar(
                      progress: progress,
                      primaryColor: primaryColor,
                      backgroundColor: widget.darkMode ? Colors.grey[700]! : Colors.grey[300]!,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    formatDuration(totalDuration ?? Duration.zero),
                    style: TextStyle(
                      fontSize: 12,
                      color: secondaryTextColor,
                    ),
                  ),
                ],
              ),
            ),

          // Controls
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Navigation controls
                Row(
                  children: [
                    IconButton(
                      icon: Icon(
                        Icons.skip_previous_rounded,
                        color: currentIndex > 0
                            ? primaryColor
                            : (widget.darkMode ? Colors.grey[600] : Colors.grey[400]),
                        size: 28,
                      ),
                      onPressed: currentIndex > 0 ? handlePrev : null,
                      tooltip: 'Previous sign',
                    ),
                    const SizedBox(width: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: primaryColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: primaryColor.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: IconButton(
                        icon: AnimatedIcon(
                          icon: AnimatedIcons.play_pause,
                          progress: _animationController,
                          color: Colors.white,
                        ),
                        onPressed: togglePlayPause,
                        tooltip: isPlaying ? 'Pause' : 'Play',
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(
                        Icons.skip_next_rounded,
                        color: currentIndex < videoSequence.length - 1
                            ? primaryColor
                            : (widget.darkMode ? Colors.grey[600] : Colors.grey[400]),
                        size: 28,
                      ),
                      onPressed: 
                          currentIndex < videoSequence.length - 1 ? handleNext : null,
                      tooltip: 'Next sign',
                    ),
                  ],
                ),

                // Position indicator and speed control
                Row(
                  children: [
                    // Position indicator
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: primaryColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: primaryColor.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: Text(
                        '${currentIndex + 1} / ${videoSequence.length}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: primaryColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Speed control
                    IconButton(
                      icon: Icon(
                        Icons.speed,
                        color: accentColor,
                      ),
                      onPressed: changePlaybackSpeed,
                      tooltip: 'Change playback speed',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ProgressBar extends StatelessWidget {
  final double progress;
  final Color primaryColor;
  final Color backgroundColor;

  const ProgressBar({
    super.key,
    required this.progress,
    required this.primaryColor,
    required this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          height: 6,
          width: constraints.maxWidth,
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(3),
          ),
          child: Stack(
            children: [
              Container(
                height: 6,
                width: constraints.maxWidth * progress,
                decoration: BoxDecoration(
                  color: primaryColor,
                  borderRadius: BorderRadius.circular(3),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.5),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}