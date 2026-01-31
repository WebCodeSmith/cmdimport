import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConfig {
  static String get baseUrl {
    final envApiUrl = dotenv.env['API_URL'];
    if (envApiUrl != null && envApiUrl.isNotEmpty) {
      return envApiUrl;
    }
    
    const String? systemApiUrl = String.fromEnvironment('API_URL');
    if (systemApiUrl != null && systemApiUrl.isNotEmpty) {
      return systemApiUrl;
    }
    
    throw Exception(
      'API_URL não configurada! '
      'Crie um arquivo .env na raiz do projeto com: API_URL=http://seu-ip:8080/api'
    );
  }
  
  static String get baseUrlWithoutApi => baseUrl.replaceAll('/api', '');
}

