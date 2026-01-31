import '../config/api_config.dart';
import '../models/api_response.dart';
import '../models/produto.dart';
import 'api_service.dart';

class ProdutoService {
  static final ProdutoService _instance = ProdutoService._internal();
  factory ProdutoService() => _instance;
  ProdutoService._internal();

  final ApiService _apiService = ApiService();

  Future<ApiResponse<List<Produto>>> getEstoque({
    int? usuarioId,
    bool ocultarEstoqueZerado = false,
  }) async {
    final queryParams = <String, dynamic>{};
    if (usuarioId != null) queryParams['usuarioId'] = usuarioId;
    if (ocultarEstoqueZerado) queryParams['ocultarEstoqueZerado'] = true;

    return await _apiService.get<List<Produto>>(
      '/estoque',
      queryParams: queryParams,
      fromJson: (data) {
        if (data is List) {
          return data
              .map((p) => Produto.fromJson(p as Map<String, dynamic>))
              .toList();
        }
        return [];
      },
    );
  }
}

