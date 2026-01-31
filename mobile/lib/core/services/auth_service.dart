import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import '../models/api_response.dart';
import 'api_service.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final ApiService _apiService = ApiService();
  User? _currentUser;
  String? _token;

  User? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;

  Future<void> loadUserFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString('user');
    _token = prefs.getString('token');
    
    if (userJson != null) {
      try {
        final userMap = Map<String, dynamic>.from(
          jsonDecode(userJson) as Map<String, dynamic>
        );
        _currentUser = User.fromJson(userMap);
      } catch (e) {
        // Se houver erro, limpar dados
        await clearStorage();
      }
    }
  }

  Future<ApiResponse<Map<String, dynamic>>> login(
    String email,
    String senha,
  ) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      '/auth/login',
      {'email': email, 'senha': senha},
      fromJson: (data) => data as Map<String, dynamic>,
    );

    if (response.success && response.data != null) {
      final userData = response.data!['user'] ?? response.data;
      _currentUser = User.fromJson(userData as Map<String, dynamic>);
      _token = response.data!['token'] as String?;
      
      // Salvar no storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', jsonEncode(_currentUser!.toJson()));
      if (_token != null) {
        await prefs.setString('token', _token!);
      }
    }

    return response;
  }

  Future<ApiResponse<Map<String, dynamic>>> register(
    String nome,
    String email,
    String senha,
  ) async {
    final response = await _apiService.post<Map<String, dynamic>>(
      '/auth/register',
      {'nome': nome, 'email': email, 'senha': senha},
      fromJson: (data) => data as Map<String, dynamic>,
    );

    if (response.success && response.data != null) {
      final userData = response.data!['user'] ?? response.data;
      _currentUser = User.fromJson(userData as Map<String, dynamic>);
      _token = response.data!['token'] as String?;
      
      // Salvar no storage
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user', jsonEncode(_currentUser!.toJson()));
      if (_token != null) {
        await prefs.setString('token', _token!);
      }
    }

    return response;
  }

  Future<void> logout() async {
    _currentUser = null;
    _token = null;
    await clearStorage();
  }

  Future<void> clearStorage() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user');
    await prefs.remove('token');
  }

  bool isAdmin() {
    return _currentUser?.isAdmin ?? false;
  }
}

