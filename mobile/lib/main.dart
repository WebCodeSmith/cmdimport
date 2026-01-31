import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'core/services/auth_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';
import 'screens/vendas/cadastrar_venda_screen.dart';
import 'screens/vendas/historico_screen.dart';
import 'screens/estoque/estoque_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    await dotenv.load(fileName: '.env');
  } catch (e) {
    // Continua sem .env
  }
  
  await AuthService().loadUserFromStorage();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = AuthService();
    
    return MaterialApp(
      title: 'CMD Import',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.grey[900]!,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      routes: {
        '/': (context) => authService.isAuthenticated
            ? const DashboardScreen()
            : const LoginScreen(),
        '/login': (context) => const LoginScreen(),
        '/dashboard': (context) => const DashboardScreen(),
        '/cadastrar-venda': (context) => const CadastrarVendaScreen(),
        '/historico': (context) => const HistoricoScreen(),
        '/estoque': (context) => const EstoqueScreen(),
      },
    );
  }
}

