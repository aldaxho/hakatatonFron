import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { auth, subirFotoArbol } from '../services/firebase';
import { api } from '../services/api';
import { COLORS } from '../constants';

const SANTA_CRUZ = { latitude: -17.7863, longitude: -63.1812, latitudeDelta: 0.01, longitudeDelta: 0.01 };

const ESTADOS = [
  { value: 'plantado', label: '🌱 Plantado', color: '#059669' },
  { value: 'creciendo', label: '🌿 Creciendo', color: '#2D6A4F' },
  { value: 'muerto', label: '🍂 Muerto', color: '#9CA3AF' },
];

export default function RegistrarArbolModal({ visible, onClose, onGuardado, parcelaId, planPunto }) {
  const [especie, setEspecie] = useState('');
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState('plantado');
  const [fotoUri, setFotoUri] = useState(null);
  const [coords, setCoords] = useState(null);
  const [mapRegion, setMapRegion] = useState(SANTA_CRUZ);
  const [loadingGps, setLoadingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    setEspecie(planPunto?.especie || '');
    setNotas('');
    setEstado('plantado');
    setFotoUri(null);

    if (planPunto) {
      const region = { latitude: planPunto.lat, longitude: planPunto.lng, latitudeDelta: 0.003, longitudeDelta: 0.003 };
      setCoords({ lat: planPunto.lat, lng: planPunto.lng });
      setMapRegion(region);
    } else {
      setCoords(null);
      capturarGPS();
    }
  }, [visible, planPunto]);

  const capturarGPS = async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const region = { latitude, longitude, latitudeDelta: 0.003, longitudeDelta: 0.003 };
      setCoords({ lat: latitude, lng: longitude });
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 400);
    } catch {
      Alert.alert('GPS no disponible', 'Tocá el mapa para marcar la ubicación manualmente.');
    } finally {
      setLoadingGps(false);
    }
  };

  const handleMapPress = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ lat: latitude, lng: longitude });
  };

  const elegirFoto = async (origen) => {
    const { status } = origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la ' + (origen === 'camara' ? 'cámara' : 'galería'));
      return;
    }
    const result = origen === 'camara'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setFotoUri(result.assets[0].uri);
  };

  const handleGuardar = async () => {
    if (!especie.trim()) return Alert.alert('Falta la especie', 'Ingresá el nombre del árbol.');
    if (!coords) return Alert.alert('Sin ubicación', 'Usá el GPS o tocá el mapa para marcar la posición.');
    setLoading(true);
    try {
      let foto_url = null;
      if (fotoUri) {
        const uid = auth.currentUser?.uid || 'anonimo';
        foto_url = await subirFotoArbol(uid, fotoUri);
      }
      const arbol = await api.registrarArbol(parcelaId, {
        especie: especie.trim(),
        lat: coords.lat,
        lng: coords.lng,
        plan_punto_idx: planPunto?.idx ?? null,
        foto_url,
        notas: notas.trim() || null,
        estado,
      });
      onGuardado({ id: arbol.id, especie: especie.trim(), lat: coords.lat, lng: coords.lng,
        plan_punto_idx: planPunto?.idx ?? null, foto_url, notas, estado });
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.titulo}>Registrar árbol plantado</Text>

            {/* Foto */}
            <TouchableOpacity style={styles.fotoArea} onPress={() => Alert.alert('Agregar foto', '', [
              { text: 'Cámara', onPress: () => elegirFoto('camara') },
              { text: 'Galería', onPress: () => elegirFoto('galeria') },
              { text: 'Cancelar', style: 'cancel' },
            ])}>
              {fotoUri
                ? <Image source={{ uri: fotoUri }} style={styles.fotoPreview} />
                : <Text style={styles.fotoPlaceholder}>📷 Agregar foto</Text>}
            </TouchableOpacity>

            {/* Especie */}
            <Text style={styles.label}>Especie *</Text>
            <TextInput
              style={styles.input}
              placeholder="ej: Tipa blanca, Cedro"
              placeholderTextColor={COLORS.textSecondary}
              value={especie}
              onChangeText={setEspecie}
            />

            {/* Estado */}
            <Text style={styles.label}>Estado</Text>
            <View style={styles.estadoRow}>
              {ESTADOS.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.estadoBtn, estado === e.value && { borderColor: e.color, backgroundColor: e.color + '20' }]}
                  onPress={() => setEstado(e.value)}
                >
                  <Text style={[styles.estadoBtnTxt, estado === e.value && { color: e.color }]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mapa de ubicación */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Ubicación</Text>
              <TouchableOpacity onPress={capturarGPS} style={styles.gpsBtn} disabled={loadingGps}>
                {loadingGps
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.gpsBtnTxt}>📍 Usar GPS</Text>}
              </TouchableOpacity>
            </View>
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                style={styles.mapaUbicacion}
                initialRegion={mapRegion}
                onPress={handleMapPress}
              >
                {coords && (
                  <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }} anchor={{ x: 0.5, y: 1 }}>
                    <Text style={{ fontSize: 28 }}>🌳</Text>
                  </Marker>
                )}
              </MapView>
              {!coords && (
                <View style={styles.mapHint}>
                  <Text style={styles.mapHintTxt}>Tocá el mapa para marcar la posición</Text>
                </View>
              )}
            </View>
            {coords && (
              <Text style={styles.coordsTxt}>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>
            )}

            {/* Notas */}
            <Text style={styles.label}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.notasInput]}
              placeholder="Observaciones, riego, condiciones..."
              placeholderTextColor={COLORS.textSecondary}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={3}
            />

            {/* Botones */}
            <View style={styles.botonesRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.guardarBtn} onPress={handleGuardar} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.guardarBtnTxt}>Guardar árbol</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titulo: { fontSize: 18, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 16 },
  fotoArea: { height: 130, backgroundColor: COLORS.background, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 4, overflow: 'hidden' },
  fotoPreview: { width: '100%', height: '100%' },
  fotoPlaceholder: { fontSize: 15, color: COLORS.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  notasInput: { height: 80, textAlignVertical: 'top' },
  estadoRow: { flexDirection: 'row', gap: 8 },
  estadoBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  estadoBtnTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  gpsBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, minWidth: 90, alignItems: 'center' },
  gpsBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mapWrapper: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  mapaUbicacion: { height: 170 },
  mapHint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' },
  mapHintTxt: { backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 13, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  coordsTxt: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  botonesRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnTxt: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  guardarBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  guardarBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
