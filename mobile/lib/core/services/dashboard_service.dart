import '../models/api_response.dart';
import '../models/historico_venda.dart';
import 'api_service.dart';

class DashboardService {
  static final DashboardService _instance = DashboardService._internal();
  factory DashboardService() => _instance;
  DashboardService._internal();

  final ApiService _apiService = ApiService();

  Future<ApiResponse<List<HistoricoVenda>>> getHistoricoVendas({
    int pagina = 1,
    int limite = 1000,
    int? usuarioId,
    String? dataInicio,
    String? dataFim,
    String? cliente,
    String? ordenacao,
  }) async {
    final queryParams = <String, dynamic>{
      'pagina': pagina,
      'limite': limite,
    };

    if (usuarioId != null) {
      queryParams['usuarioId'] = usuarioId;
    }
    if (dataInicio != null && dataInicio.isNotEmpty) {
      queryParams['dataInicio'] = dataInicio;
    }
    if (dataFim != null && dataFim.isNotEmpty) {
      queryParams['dataFim'] = dataFim;
    }
    if (cliente != null && cliente.isNotEmpty) {
      queryParams['cliente'] = cliente;
    }
    if (ordenacao != null && ordenacao.isNotEmpty) {
      queryParams['ordenacao'] = ordenacao;
    }

    return await _apiService.get<List<HistoricoVenda>>(
      '/vendas/historico',
      queryParams: queryParams,
      fromJson: (data) {
        if (data is List) {
          try {
            return data
                .map((v) => HistoricoVenda.fromJson(v as Map<String, dynamic>))
                .toList();
          } catch (e) {
            return <HistoricoVenda>[];
          }
        }
        return <HistoricoVenda>[];
      },
    );
  }
}

