import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_layout.dart';
import 'main_shell.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (SupabaseService.isConfigured &&
        !(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      final client = SupabaseService.client;
      if (client != null) {
        final auth = await client.auth.signInWithPassword(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
        final userId = auth.user?.id;
        if (userId == null) {
          throw const AuthException('No authenticated user was returned.');
        }

        Map<String, dynamic>? profile;
        try {
          profile = await client
              .from('profiles')
              .select('role, is_active')
              .eq('id', userId)
              .maybeSingle();
        } on PostgrestException {
          profile = await client
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .maybeSingle();
        }
        final responder = await client
            .from('responders')
            .select('id')
            .eq('profile_id', userId)
            .maybeSingle();
        if (profile == null ||
            profile['is_active'] == false ||
            responder == null) {
          await client.auth.signOut();
          throw const AuthException(
            'This account is not an active, linked NodeGuard responder.',
          );
        }
      }
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const MainShell()));
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Login failed: $error')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Form(
            key: _formKey,
            child: SingleChildScrollView(
              padding: AppLayout.pagePadding(context),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final logo = Container(
                          width: 58,
                          height: 58,
                          decoration: BoxDecoration(
                            color: AppColors.deepGreen,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          padding: const EdgeInsets.all(5),
                          child: Image.asset('assets/mdrrmc-logo.png'),
                        );
                        final title = Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'NodeGuard Personnel',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(fontWeight: FontWeight.w900),
                            ),
                            const Text('Authorized personnel only',
                                style: TextStyle(color: AppColors.mutedText)),
                          ],
                        );
                        if (constraints.maxWidth < 280) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              logo,
                              const SizedBox(height: 12),
                              title,
                            ],
                          );
                        }
                        return Row(
                          children: [
                            logo,
                            const SizedBox(width: 12),
                            Expanded(child: title),
                          ],
                        );
                      },
                    ),
                    const SizedBox(height: 28),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      textInputAction: TextInputAction.next,
                      validator: (value) {
                        if (!SupabaseService.isConfigured) return null;
                        final email = value?.trim() ?? '';
                        return email.contains('@')
                            ? null
                            : 'Enter a valid email address.';
                      },
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword),
                          icon: Icon(_obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined),
                        ),
                      ),
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) {
                        if (!_isSubmitting) _login();
                      },
                      validator: (value) {
                        if (!SupabaseService.isConfigured) return null;
                        return (value?.isNotEmpty ?? false)
                            ? null
                            : 'Enter your password.';
                      },
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: _isSubmitting ? null : _login,
                      icon: const Icon(Icons.login),
                      label: Text(_isSubmitting
                          ? 'Signing In...'
                          : SupabaseService.isConfigured
                              ? 'Login'
                              : 'Enter Demo Mode'),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'Access is limited to authorized MDRRMO, EMS, BFP, PNP, and barangay response personnel.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.mutedText),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
