import 'package:intl/intl.dart';

class Formatters {
  static String formatCurrency(double value) {
    return NumberFormat.currency(
      locale: 'pt_BR',
      symbol: 'R\$',
      decimalDigits: 2,
    ).format(value);
  }

  static String formatDate(String dateString) {
    if (dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM HH:mm', 'pt_BR').format(date);
    } catch (e) {
      return dateString;
    }
  }

  static String formatDateFull(String dateString) {
    if (dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('dd/MM/yyyy HH:mm', 'pt_BR').format(date);
    } catch (e) {
      return dateString;
    }
  }

  static String formatPhone(String phone) {
    if (phone.isEmpty) return '';
    final numbers = phone.replaceAll(RegExp(r'\D'), '');
    if (numbers.length <= 10) {
      return numbers.replaceFirstMapped(
        RegExp(r'^(\d{2})(\d{4})(\d{4})$'),
        (m) => '(${m[1]}) ${m[2]}-${m[3]}',
      );
    }
    return numbers.replaceFirstMapped(
      RegExp(r'^(\d{2})(\d{5})(\d{4})$'),
      (m) => '(${m[1]}) ${m[2]}-${m[3]}',
    );
  }
}

