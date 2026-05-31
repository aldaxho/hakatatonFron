import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [departamento, setDepartamento] = useState('Santa Cruz');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!email || !password || !nombre) return setError('Completá todos los campos');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres');
    setError('');
    setLoading(true);
    try {
      await register(email, password, nombre, departamento);
    } catch (e) {
      setError(e.message.includes('email-already-in-use') ? 'Ese email ya está registrado' : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Empezá a plantar árboles nativos</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Nombre completo" placeholderTextColor={COLORS.textSecondary} value={nombre} onChangeText={setNombre} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Contraseña (mín. 6 caracteres)" placeholderTextColor={COLORS.textSecondary} value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Departamento" placeholderTextColor={COLORS.textSecondary} value={departamento} onChangeText={setDepartamento} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear cuenta</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>¿Ya tenés cuenta? Iniciá sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.background, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.primaryDark },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 32, marginTop: 4 },
  form: { gap: 12 },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: COLORS.error, fontSize: 14, textAlign: 'center' },
  link: { color: COLORS.primary, textAlign: 'center', marginTop: 8, fontSize: 15 },
});
