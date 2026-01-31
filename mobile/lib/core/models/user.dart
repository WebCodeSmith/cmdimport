class User {
  final int id;
  final String nome;
  final String email;
  final bool isAdmin;

  User({
    required this.id,
    required this.nome,
    required this.email,
    required this.isAdmin,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as int,
      nome: json['nome'] as String,
      email: json['email'] as String,
      isAdmin: json['isAdmin'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nome': nome,
      'email': email,
      'isAdmin': isAdmin,
    };
  }
}

