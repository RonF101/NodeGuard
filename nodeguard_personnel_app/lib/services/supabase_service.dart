import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static const url = String.fromEnvironment('SUPABASE_URL');
  static const anonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get isConfigured => url.isNotEmpty && anonKey.isNotEmpty;

  static SupabaseClient? get client =>
      isConfigured ? Supabase.instance.client : null;

  static Future<void> initialize() async {
    if (!isConfigured) return;
    await Supabase.initialize(url: url, publishableKey: anonKey);
  }
}
