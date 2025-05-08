import 'package:aurisvue_mobile/screens/isl_view_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:aurisvue_mobile/providers/theme_provider.dart';
import 'package:aurisvue_mobile/providers/speech_provider.dart';
import 'package:flutter/services.dart';

class PublicModeScreen extends StatefulWidget {
  const PublicModeScreen({super.key});

  @override
  State<PublicModeScreen> createState() => _PublicModeScreenState();
}

class _PublicModeScreenState extends State<PublicModeScreen> {
  bool _showHistory = false;
  bool _shouldTranslate = false;
  bool _showFloatingControls = true;
  bool _isMobile = false;

  @override
  void initState() {
    super.initState();

    // Lock orientation to portrait for consistent UI
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

    // Determine if the device is mobile based on screen size
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final size = MediaQuery.of(context).size;
      setState(() {
        _isMobile = size.width < 600;
      });
    });
  }

  @override
  void dispose() {
    // Allow all orientations when widget is disposed
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    super.dispose();
  }

  void _toggleHistory() {
    setState(() {
      _showHistory = !_showHistory;
    });
  }

  void _handleTranslateClick() {
    final speechProvider = Provider.of<SpeechProvider>(context, listen: false);
    print(speechProvider.detectedSpeech);
    if (speechProvider.detectedSpeech.isNotEmpty) {
      setState(() {
        _shouldTranslate = true;
      });
      speechProvider.startTranslating();
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final speechProvider = Provider.of<SpeechProvider>(context);

    final bool isDarkMode = themeProvider.isDarkMode;
    final bool isMicActive = speechProvider.isListening;

    // Determine if we should show the main controls
    final bool shouldShowMainControls =
        !_isMobile || (_isMobile && !_showFloatingControls);

    return Scaffold(
      backgroundColor: isDarkMode ? Colors.grey[900] : Colors.grey[100],
      appBar: AppBar(
        title: Row(
          children: [
        Image.asset(
          'assets/AurisVue_logo.png',
          height: 42.0,
          width: 40,
          fit: BoxFit.contain,
        ),
        const SizedBox(width: 8),
        Text(
          'AurisVue',
          style: TextStyle(
            color: isDarkMode ? Colors.white : Colors.black87,
            fontWeight: FontWeight.bold,
          ),
        ),
          ],
        ),
        backgroundColor: isDarkMode ? Colors.grey[850] : Colors.white,
        actions: [
          IconButton(
        icon: Icon(
          isDarkMode ? Icons.wb_sunny_outlined : Icons.nights_stay,
          color: isDarkMode ? Colors.amber[400] : Colors.blueGrey,
        ),
        onPressed: themeProvider.toggleTheme,
        tooltip: 'Toggle theme',
          ),
        ],
      ),
      body: Container(
        // padding: EdgeInsets.all(20),
        margin: EdgeInsets.all(20),
        child: Column(
          children: [
            // Main content area with ISL Viewer
            Expanded(
              child: Row(
                children: [
                  // ISL Visualization area - takes 2/3 on large screens, full on mobile
                  Expanded(
                    flex: 2,
                    child: Container(
                      // padding: EdgeInsets.all(12.0),
                      // margin: EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors:
                              isDarkMode
                                  ? [Colors.grey[900]!, Colors.grey[850]!]
                                  : [Colors.grey[100]!, Colors.grey[200]!],
                        ),
                      ),
                      child: Column(
                        children: [
                          // ISL Viewer component
                          SizedBox(height: 60),

                          Center(
                            child: ISLViewerScreen(
                              speechInput: speechProvider.detectedSpeech,
                              darkMode: isDarkMode,
                              shouldTranslate: _shouldTranslate,
                              onTranslationDone: () {
                                setState(() {
                                  _shouldTranslate = false;
                                });
                              },
                            ),
                          ),
                          SizedBox(height: 60),
                          // Current transcript overlay
                          // if (speechProvider.detectedSpeech.isNotEmpty)
                          //   Positioned(
                          //     bottom: 20,
                          //     left: 20,
                          //     right: 20,
                          //     child: Container(
                          //       padding: const EdgeInsets.all(16),
                          //       decoration: BoxDecoration(
                          //         color: isDarkMode
                          //             ? Colors.grey[800]!.withOpacity(0.9)
                          //             : Colors.white.withOpacity(0.9),
                          //         borderRadius: BorderRadius.circular(12),
                          //         boxShadow: [
                          //           BoxShadow(
                          //             color: Colors.black.withOpacity(0.2),
                          //             blurRadius: 10,
                          //             offset: const Offset(0, 5),
                          //           ),
                          //         ],
                          //         border: Border.all(
                          //           color:
                          //               isDarkMode
                          //                   ? Colors.grey[700]!
                          //                   : Colors.grey[300]!,
                          //           width: 1,
                          //         ),
                          //       ),
                          //       child: Column(
                          //         crossAxisAlignment: CrossAxisAlignment.center,
                          //         children: [
                          //           Text(
                          //             speechProvider.detectedSpeech,
                          //             textAlign: TextAlign.center,
                          //             style: TextStyle(
                          //               fontWeight: FontWeight.w500,
                          //               fontSize: 16,
                          //               color:
                          //                   isDarkMode
                          //                       ? Colors.white
                          //                       : Colors.black87,
                          //             ),
                          //           ),
                          //           const SizedBox(height: 12),
                          //           ElevatedButton(
                          //             onPressed: _handleTranslateClick,
                          //             style: ElevatedButton.styleFrom(
                          //               backgroundColor: Colors.blue[600],
                          //               foregroundColor: Colors.white,
                          //               padding: const EdgeInsets.symmetric(
                          //                 horizontal: 20,
                          //                 vertical: 10,
                          //               ),
                          //               shape: RoundedRectangleBorder(
                          //                 borderRadius: BorderRadius.circular(8),
                          //               ),
                          //             ),
                          //             child: const Text('Translate to ISL'),
                          //           ),
                          //         ],
                          //       ),
                          //     ),
                          //   ),
                        ],
                      ),
                    ),
                  ),

                  // Controls Panel - only visible on larger screens or when expanded on mobile
                  if (shouldShowMainControls)
                    Expanded(
                      flex: 1,
                      child: Container(
                        decoration: BoxDecoration(
                          color: isDarkMode ? Colors.grey[850] : Colors.white,
                          border: Border(
                            left: BorderSide(
                              color:
                                  isDarkMode
                                      ? Colors.grey[700]!
                                      : Colors.grey[300]!,
                              width: 1,
                            ),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            children: [
                              // Main microphone control
                              Expanded(
                                child: Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      // Large microphone button
                                      InkWell(
                                        onTap: () {
                                          if (isMicActive) {
                                            speechProvider.stopListening();
                                          } else {
                                            speechProvider.startListening();
                                          }
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.all(24),
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            color:
                                                isMicActive
                                                    ? Colors.red[500]
                                                    : isDarkMode
                                                    ? Colors.grey[700]
                                                    : Colors.grey[200],
                                            boxShadow: [
                                              BoxShadow(
                                                color:
                                                    isMicActive
                                                        ? Colors.red
                                                            .withOpacity(0.3)
                                                        : Colors.black
                                                            .withOpacity(0.1),
                                                blurRadius: 10,
                                                spreadRadius: 2,
                                              ),
                                            ],
                                          ),
                                          child: Icon(
                                            isMicActive
                                                ? Icons.mic_off
                                                : Icons.mic,
                                            size: 36,
                                            color:
                                                isMicActive
                                                    ? Colors.white
                                                    : isDarkMode
                                                    ? Colors.white70
                                                    : Colors.grey[800],
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      // Status text
                                      Text(
                                        isMicActive
                                            ? 'Listening... Speak clearly for ISL translation'
                                            : 'Press the microphone button to start ISL translation',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 16,
                                          color:
                                              isDarkMode
                                                  ? Colors.grey[300]
                                                  : Colors.grey[700],
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                      // Button
                                      ElevatedButton(
                                        onPressed:
                                            isMicActive
                                                ? () =>
                                                    speechProvider
                                                        .stopListening()
                                                : () =>
                                                    speechProvider
                                                        .startListening(),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              isMicActive
                                                  ? Colors.red[500]
                                                  : Colors.blue[600],
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 24,
                                            vertical: 14,
                                          ),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(
                                              8,
                                            ),
                                          ),
                                          minimumSize: const Size(
                                            double.infinity,
                                            50,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isMicActive
                                                  ? Icons.mic_off
                                                  : Icons.mic,
                                              size: 18,
                                            ),
                                            const SizedBox(width: 8),
                                            Text(
                                              isMicActive
                                                  ? 'Stop Listening'
                                                  : 'Start Listening',
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (speechProvider
                                          .detectedSpeech
                                          .isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            top: 16.0,
                                          ),
                                          child: ElevatedButton(
                                            onPressed: _handleTranslateClick,
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  Colors.green[600],
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                    horizontal: 24,
                                                    vertical: 14,
                                                  ),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8),
                                              ),
                                              minimumSize: const Size(
                                                double.infinity,
                                                50,
                                              ),
                                            ),
                                            child: const Text(
                                              'Translate to ISL',
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ),
                              // History toggle
                              Column(
                                children: [
                                  const Divider(),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      TextButton.icon(
                                        onPressed: _toggleHistory,
                                        icon: Icon(
                                          _showHistory
                                              ? Icons.keyboard_arrow_down
                                              : Icons.keyboard_arrow_up,
                                          size: 18,
                                          color:
                                              isDarkMode
                                                  ? Colors.blue[300]
                                                  : Colors.blue[700],
                                        ),
                                        label: Text(
                                          'Speech History',
                                          style: TextStyle(
                                            color:
                                                isDarkMode
                                                    ? Colors.blue[300]
                                                    : Colors.blue[700],
                                          ),
                                        ),
                                      ),
                                      if (speechProvider
                                          .transcriptHistory
                                          .isNotEmpty)
                                        TextButton(
                                          onPressed:
                                              speechProvider.clearHistory,
                                          child: Text(
                                            'Clear All',
                                            style: TextStyle(
                                              color: Colors.red[400],
                                              fontSize: 13,
                                            ),
                                          ),
                                        ),
                                    ],
                                  ),
                                  if (_showHistory)
                                    Container(
                                      height: 150,
                                      margin: const EdgeInsets.only(top: 8),
                                      padding: const EdgeInsets.all(8),
                                      decoration: BoxDecoration(
                                        color:
                                            isDarkMode
                                                ? Colors.grey[800]
                                                : Colors.grey[100],
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color:
                                              isDarkMode
                                                  ? Colors.grey[700]!
                                                  : Colors.grey[300]!,
                                        ),
                                      ),
                                      child:
                                          speechProvider
                                                  .transcriptHistory
                                                  .isNotEmpty
                                              ? ListView.builder(
                                                itemCount:
                                                    speechProvider
                                                        .transcriptHistory
                                                        .length,
                                                itemBuilder: (context, index) {
                                                  final item =
                                                      speechProvider
                                                          .transcriptHistory[index];
                                                  return Card(
                                                    margin:
                                                        const EdgeInsets.only(
                                                          bottom: 8,
                                                        ),
                                                    color:
                                                        isDarkMode
                                                            ? Colors.grey[850]
                                                            : Colors.white,
                                                    child: Padding(
                                                      padding:
                                                          const EdgeInsets.all(
                                                            8.0,
                                                          ),
                                                      child: Column(
                                                        crossAxisAlignment:
                                                            CrossAxisAlignment
                                                                .start,
                                                        children: [
                                                          Row(
                                                            children: [
                                                              Container(
                                                                padding:
                                                                    const EdgeInsets.symmetric(
                                                                      horizontal:
                                                                          6,
                                                                      vertical:
                                                                          2,
                                                                    ),
                                                                decoration: BoxDecoration(
                                                                  color:
                                                                      isDarkMode
                                                                          ? Colors
                                                                              .grey[700]
                                                                          : Colors
                                                                              .grey[200],
                                                                  borderRadius:
                                                                      BorderRadius.circular(
                                                                        10,
                                                                      ),
                                                                ),
                                                                child: Text(
                                                                  item.timestamp,
                                                                  style: TextStyle(
                                                                    fontSize:
                                                                        10,
                                                                    color:
                                                                        isDarkMode
                                                                            ? Colors.grey[300]
                                                                            : Colors.grey[600],
                                                                  ),
                                                                ),
                                                              ),
                                                            ],
                                                          ),
                                                          const SizedBox(
                                                            height: 4,
                                                          ),
                                                          Text(
                                                            item.text,
                                                            style: TextStyle(
                                                              fontSize: 13,
                                                              color:
                                                                  isDarkMode
                                                                      ? Colors
                                                                          .white
                                                                      : Colors
                                                                          .black87,
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  );
                                                },
                                              )
                                              : Center(
                                                child: Text(
                                                  'No speech history yet',
                                                  style: TextStyle(
                                                    color:
                                                        isDarkMode
                                                            ? Colors.grey[400]
                                                            : Colors.grey[600],
                                                    fontStyle: FontStyle.italic,
                                                  ),
                                                ),
                                              ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
      // Floating action button for mobile - appears when controls are hidden
      floatingActionButton:
          _isMobile
              ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Toggle controls button
                  // FloatingActionButton(
                  //   heroTag: "toggleControls",
                  //   onPressed: () {
                  //     setState(() {
                  //       _showFloatingControls = !_showFloatingControls;
                  //     });
                  //   },
                  //   backgroundColor:
                  //       isDarkMode ? Colors.grey[800] : Colors.white,
                  //   child: Icon(Icons.message, color: Colors.blue[500]),
                  // ),
                  const SizedBox(height: 16),
                  // Quick mic toggle
                  FloatingActionButton(
                    heroTag: "micToggle",
                    onPressed: () {
                      if (isMicActive) {
                        speechProvider.stopListening();
                      } else {
                        speechProvider.startListening();
                      }
                    },
                    backgroundColor:
                        isMicActive ? Colors.red[500] : Colors.blue[600],
                    child: Icon(
                      isMicActive ? Icons.mic_off : Icons.mic,
                      color: Colors.white,
                    ),
                  ),
                ],
              )
              : null,
      bottomSheet:
          _isMobile && _showFloatingControls
              ? Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color:
                      isDarkMode
                          ? Colors.grey[850]
                          : Colors.white.withOpacity(0.95),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, -5),
                    ),
                  ],
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(20),
                  ),
                  border: Border(
                    top: BorderSide(
                      color: isDarkMode ? Colors.grey[700]! : Colors.grey[300]!,
                    ),
                  ),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'ISL Translation',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDarkMode ? Colors.white : Colors.black87,
                          ),
                        ),
                        // IconButton(
                        //   icon: const Icon(Icons.close),
                        //   onPressed:
                        //       () =>
                        //           setState(() => _showFloatingControls = false),
                        //   color:
                        //       isDarkMode ? Colors.grey[300] : Colors.grey[800],
                        // ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (speechProvider.detectedSpeech.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color:
                              isDarkMode ? Colors.grey[800] : Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color:
                                isDarkMode
                                    ? Colors.grey[700]!
                                    : Colors.grey[300]!,
                          ),
                        ),
                        child: Text(
                          speechProvider.detectedSpeech,
                          style: TextStyle(
                            fontSize: 14,
                            color: isDarkMode ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              if (isMicActive) {
                                speechProvider.stopListening();
                              } else {
                                speechProvider.startListening();
                              }
                            },
                            icon: Icon(isMicActive ? Icons.mic_off : Icons.mic),
                            label: Text(
                              isMicActive
                                  ? 'Stop Listening'
                                  : 'Start Listening',
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  isMicActive
                                      ? Colors.red[500]
                                      : Colors.blue[600],
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (speechProvider.detectedSpeech.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: ElevatedButton(
                          onPressed: _handleTranslateClick,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green[600],
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            minimumSize: const Size(double.infinity, 48),
                          ),
                          child: const Text('Translate to ISL'),
                        ),
                      ),
                  ],
                ),
              )
              : null,
    );
  }
}
