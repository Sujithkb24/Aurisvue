import 'dart:developer';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ISLService {
  static const String apiBaseUrl = 'https://aurisvue-api.onrender.com';

  // Translate text to ISL gestures using only the API
  Future<Map<String, dynamic>> translateToISL(String text) async {
    log('ISL Service: Translating text: "$text"');

    final url = Uri.parse('$apiBaseUrl/analyze');
    final headers = {'Content-Type': 'application/json'};
    final body = json.encode({'transcript': text});

    final response = await http.post(url, headers: headers, body: body);

    if (response.statusCode == 307 &&
        response.headers.containsKey('location')) {
          
      final redirectUrl = Uri.parse(response.headers['location']!);
      print(redirectUrl);
      final redirectedResponse = await http.post(
        redirectUrl,
        headers: headers,
        body: body,
      );
      return json.decode(redirectedResponse.body);
    } else if (response.statusCode == 200 && response.body.isNotEmpty) {
      return json.decode(response.body);
    } else {
      throw Exception('API call failed with status: ${response.statusCode}');
    }
  }
}
