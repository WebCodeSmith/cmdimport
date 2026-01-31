import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import '../models/api_response.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String get baseUrl => ApiConfig.baseUrl;

  // Cache para SharedPreferences
  SharedPreferences? _prefs;

  Future<SharedPreferences> _getPrefs() async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await _getPrefs();
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    
    final token = prefs.getString('token');
    if (token != null) {
      headers['Authorization'] = 'Bearer $token';
    }
    
    final userJson = prefs.getString('user');
    if (userJson != null) {
      try {
        final userMap = jsonDecode(userJson) as Map<String, dynamic>;
        final userId = userMap['id'];
        if (userId != null) {
          headers['X-User-ID'] = userId.toString();
        }
      } catch (e) {
        // Ignorar erro de parsing
      }
    }
    
    return headers;
  }

  Future<ApiResponse<T>> get<T>(
    String endpoint, {
    Map<String, dynamic>? queryParams,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      var uri = Uri.parse('$baseUrl$endpoint');
      
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams.map(
          (key, value) => MapEntry(key, value.toString()),
        ));
      }

      final response = await http.get(
        uri,
        headers: await _getHeaders(),
      );

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse<T>(
        success: false,
        message: 'Erro de conexão: ${e.toString()}',
      );
    }
  }

  Future<ApiResponse<T>> post<T>(
    String endpoint,
    Map<String, dynamic> body, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      
      final response = await http.post(
        uri,
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse<T>(
        success: false,
        message: 'Erro de conexão: ${e.toString()}',
      );
    }
  }

  Future<ApiResponse<T>> put<T>(
    String endpoint,
    Map<String, dynamic> body, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      
      final response = await http.put(
        uri,
        headers: await _getHeaders(),
        body: jsonEncode(body),
      );

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse<T>(
        success: false,
        message: 'Erro de conexão: ${e.toString()}',
      );
    }
  }

  Future<ApiResponse<T>> delete<T>(
    String endpoint, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      
      final response = await http.delete(
        uri,
        headers: await _getHeaders(),
      );

      return _handleResponse<T>(response, fromJson);
    } catch (e) {
      return ApiResponse<T>(
        success: false,
        message: 'Erro de conexão: ${e.toString()}',
      );
    }
  }

  ApiResponse<T> _handleResponse<T>(
    http.Response response,
    T Function(dynamic)? fromJson,
  ) {
    try {
      final jsonData = jsonDecode(response.body) as Map<String, dynamic>;
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse.fromJson(jsonData, fromJson);
      } else {
        return ApiResponse<T>(
          success: false,
          message: jsonData['message'] as String? ?? 
                  'Erro na requisição: ${response.statusCode}',
        );
      }
    } catch (e) {
      return ApiResponse<T>(
        success: false,
        message: 'Erro ao processar resposta: ${e.toString()}',
      );
    }
  }
}

