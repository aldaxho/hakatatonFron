import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { api } from '../services/api';
import { COLORS } from '../constants';

const SANTA_CRUZ = { latitude: -17.7863, longitude: -63.1812, latitudeDelta: 0.1, longitudeDelta: 0.1 };

export default function AnalisisScreen({ navigation }) {
  const [puntos, setPuntos] = useState([]);
  const [modo, setModo] = useState('ambiental');
  const [cultivo, setCultivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCultivoModal, setShowCultivoModal] = useState(false);

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPuntos((prev) => [...prev, { latitude, longitude }]);
  };

  const undoPoint = () => setPuntos((prev) => prev.slice(0, -1));
  const clearPoints = () => setPuntos([]);

  const handleAnalizar = async () => {
    if (puntos.length < 3) return Alert.alert('Faltan puntos', 'Marcá al menos 3 puntos en el mapa para formar el polígono.');
    if (modo === 'agro' && !cultivo) return setShowCultivoModal(true);

    const poligono = puntos.map((p) => [p.longitude, p.latitude]);
    setLoading(true);
    try {
      const resultado = await api.analizar(poligono, modo, modo === 'agro' ? cultivo : undefined);
      navigation.navigate('Resultado', { resultado, poligono: puntos, modo });
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={SANTA_CRUZ} onPress={handleMapPress}>
        {puntos.length >= 3 && (
          <Polygon
            coordinates={puntos}
            fillColor="rgba(45,106,79,0.25)"
            strokeColor={COLORS.primary}
            strokeWidth={2}
          />
        )}
        {puntos.map((p, i) => (
          <Marker key={i} coordinate={p} pinColor={COLORS.primary} />
        ))}
      </MapView>

      {/* Instrucción */}
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          {puntos.length === 0 ? 'Tocá el mapa para marcar el polígono de tu terreno' :
           puntos.length < 3 ? `${puntos.length} punto${puntos.length > 1 ? 's' : ''} — necesitás al menos 3` :
           `${puntos.length} puntos — listo para analizar`}
        </Text>
      </View>

      {/* Panel inferior */}
      <View style={styles.panel}>
        {/* Modo */}
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, modo === 'ambiental' && styles.modeBtnActive]} onPress={() => setModo('ambiental')}>
            <Text style={[styles.modeTxt, modo === 'ambiental' && styles.modeTxtActive]}>🌿 Ambiental</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, modo === 'agro' && styles.modeBtnActive]} onPress={() => setModo('agro')}>
            <Text style={[styles.modeTxt, modo === 'agro' && styles.modeTxtActive]}>🌾 Agro</Text>
          </TouchableOpacity>
        </View>

        {modo === 'agro' && (
          <TextInput
            style={styles.input}
            placeholder="Cultivo actual (ej: soya, maiz)"
            placeholderTextColor={COLORS.textSecondary}
            value={cultivo}
            onChangeText={setCultivo}
          />
        )}

        <View style={styles.actionBtns}>
          <TouchableOpacity style={styles.undoBtn} onPress={undoPoint}>
            <Text style={styles.undoBtnTxt}>↩ Deshacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearPoints}>
            <Text style={styles.clearBtnTxt}>✕ Limpiar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.analyzeBtn, puntos.length < 3 && styles.analyzeBtnDisabled]} onPress={handleAnalizar} disabled={loading || puntos.length < 3}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.analyzeBtnTxt}>Analizar terreno</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  hint: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  hintText: { color: '#fff', fontSize: 13 },
  panel: { backgroundColor: COLORS.white, padding: 16, gap: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8 },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  modeBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EBF5EE' },
  modeTxt: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  modeTxtActive: { color: COLORS.primary },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  actionBtns: { flexDirection: 'row', gap: 8 },
  undoBtn: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  undoBtnTxt: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  clearBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, alignItems: 'center' },
  clearBtnTxt: { fontSize: 14, color: COLORS.error, fontWeight: '600' },
  analyzeBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  analyzeBtnDisabled: { backgroundColor: COLORS.border },
  analyzeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
