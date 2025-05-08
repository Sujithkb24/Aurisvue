import 'package:aurisvue_mobile/screens/public_mode_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:aurisvue_mobile/providers/theme_provider.dart';
import 'package:aurisvue_mobile/providers/speech_provider.dart';
 
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => SpeechProvider()),
      ],
      child: const AurisVueApp(),
    ),
  );
}

class AurisVueApp extends StatelessWidget {
  const AurisVueApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return MaterialApp(
      title: 'AurisVue',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      themeMode: themeProvider.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      home: const PublicModeScreen(),
    );
  }
}
