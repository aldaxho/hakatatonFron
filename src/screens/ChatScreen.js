import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAudioRecorder, createAudioPlayer, AudioModule, RecordingPresets } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { api } from '../services/api';
import { COLORS } from '../constants';

function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      {!isUser && <Text style={styles.botIcon}>🌳</Text>}
      <Text style={[styles.bubbleTxt, isUser && styles.bubbleTxtUser]}>{msg.text}</Text>
    </View>
  );
}

export default function ChatScreen({ route }) {
  const parcela_id = route?.params?.parcela_id ?? null;
  const pregunta_inicial = route?.params?.pregunta_inicial ?? null;

  const [messages, setMessages] = useState([
    { id: '0', role: 'bot', text: 'Hola! Soy SombraAI. Preguntame sobre árboles nativos, cuidados o cuándo plantar en Santa Cruz.' },
  ]);
  const [input, setInput] = useState(pregunta_inicial || '');
  const [loading, setLoading] = useState(false);
  const [vozActiva, setVozActiva] = useState(false);
  const [estadoVoz, setEstadoVoz] = useState('idle'); // idle | grabando | procesando
  const listRef = useRef(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    AudioModule.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const data = await api.chat(text, parcela_id);
      const botText = data.respuesta;
      setMessages((prev) => [...prev, { id: Date.now().toString() + 'b', role: 'bot', text: botText }]);
      if (vozActiva) reproducirRespuesta(botText);
    } catch (e) {
      setMessages((prev) => [...prev, { id: Date.now().toString() + 'e', role: 'bot', text: 'Error al conectar con el servidor.' }]);
    } finally {
      setLoading(false);
    }
  };

  const reproducirRespuesta = async (texto) => {
    try {
      const { audio_base64 } = await api.sintetizar(texto);
      const fileUri = FileSystem.cacheDirectory + 'respuesta.mp3';
      await FileSystem.writeAsStringAsync(fileUri, audio_base64, { encoding: FileSystem.EncodingType.Base64 });
      const player = createAudioPlayer({ uri: fileUri });
      player.play();
    } catch (e) {
      // TTS no crítico, si falla simplemente no suena
    }
  };

  const toggleGrabacion = async () => {
    if (estadoVoz === 'grabando') {
      await detenerGrabacion();
    } else {
      await iniciarGrabacion();
    }
  };

  const iniciarGrabacion = async () => {
    try {
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso al micrófono.');
        return;
      }
      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      audioRecorder.record();
      setEstadoVoz('grabando');
    } catch (e) {
      Alert.alert('Error', 'No se pudo iniciar la grabación.');
    }
  };

  const detenerGrabacion = async () => {
    setEstadoVoz('procesando');
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      const audio_base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const { texto } = await api.transcribir(audio_base64);

      if (texto?.trim()) {
        setInput(texto.trim());
        await send(texto.trim());
      } else {
        Alert.alert('No te escuché', 'No se detectó voz. Intentá de nuevo.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo procesar el audio.');
    } finally {
      setEstadoVoz('idle');
    }
  };

  const micColor = estadoVoz === 'grabando' ? '#EF4444' : estadoVoz === 'procesando' ? COLORS.border : COLORS.primaryDark;
  const micIcon = estadoVoz === 'grabando' ? '⏹' : estadoVoz === 'procesando' ? '⏳' : '🎙';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableOpacity style={[styles.vozToggle, vozActiva && styles.vozToggleActive]} onPress={() => setVozActiva((v) => !v)}>
        <Text style={[styles.vozToggleTxt, vozActiva && styles.vozToggleTxtActive]}>
          {vozActiva ? '🔊 Respuesta en voz: ON' : '🔇 Respuesta en voz: OFF'}
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Bubble msg={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingTxt}>SombraAI está respondiendo...</Text>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.micBtn, { backgroundColor: micColor }]}
          onPress={toggleGrabacion}
          disabled={estadoVoz === 'procesando' || loading}
        >
          <Text style={styles.micIcon}>{micIcon}</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Preguntá sobre árboles y cuidados..."
          placeholderTextColor={COLORS.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => send()}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      {estadoVoz === 'grabando' && (
        <View style={styles.grabandoBanner}>
          <Text style={styles.grabandoTxt}>🔴 Grabando... tocá el micrófono para enviar</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  vozToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  vozToggleActive: { backgroundColor: '#DCFCE7' },
  vozToggleTxt: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  vozToggleTxtActive: { color: COLORS.primary },
  list: { padding: 16, gap: 10, paddingBottom: 8 },
  bubble: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleBot: { alignSelf: 'flex-start' },
  botIcon: { fontSize: 24, marginTop: 2 },
  bubbleTxt: { backgroundColor: COLORS.white, borderRadius: 16, padding: 12, fontSize: 15, color: COLORS.text, lineHeight: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  bubbleTxtUser: { backgroundColor: COLORS.primary, color: '#fff' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  typingTxt: { fontSize: 13, color: COLORS.textSecondary },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'flex-end' },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  micIcon: { fontSize: 18 },
  input: { flex: 1, backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  grabandoBanner: { backgroundColor: '#FEE2E2', paddingVertical: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#FECACA' },
  grabandoTxt: { fontSize: 13, color: '#991B1B', fontWeight: '600' },
});
