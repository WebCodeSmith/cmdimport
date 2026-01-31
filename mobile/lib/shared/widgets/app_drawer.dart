import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';

class AppDrawer extends StatelessWidget {
  final String currentRoute;
  final AuthService authService;

  const AppDrawer({
    super.key,
    required this.currentRoute,
    required this.authService,
  });

  @override
  Widget build(BuildContext context) {
    final user = authService.currentUser;

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          // Header do Drawer
          DrawerHeader(
            decoration: BoxDecoration(
              color: Colors.grey[900],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Text(
                    user?.nome.substring(0, 1).toUpperCase() ?? 'U',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey[900],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  user?.nome ?? 'Usuário',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  user?.email ?? '',
                  style: TextStyle(
                    color: Colors.grey[300],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),

          // Menu Items
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            onTap: () {
              Navigator.pop(context);
              if (currentRoute != '/dashboard') {
                Navigator.pushReplacementNamed(context, '/dashboard');
              }
            },
            selected: currentRoute == '/dashboard',
            selectedTileColor: Colors.grey[100],
          ),

          const Divider(),

          ListTile(
            leading: const Icon(Icons.add_shopping_cart),
            title: const Text('Cadastrar Venda'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/cadastrar-venda');
            },
          ),

          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Histórico'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/historico');
            },
          ),

          ListTile(
            leading: const Icon(Icons.inventory),
            title: const Text('Estoque'),
            onTap: () {
              Navigator.pop(context);
              Navigator.pushNamed(context, '/estoque');
            },
          ),

          const Divider(),

          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sair'),
            onTap: () async {
              Navigator.pop(context);
              await authService.logout();
              if (context.mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
        ],
      ),
    );
  }
}

