import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, TextInput, FlatList, Dimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { auth, subirFotoArbol } from '../services/firebase';
import { api } from '../services/api';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

const ESTADOS = [
  { value: 'plantado', label: '🌱 Plantado', color: '#059669' },
  { value: 'creciendo', label: '🌿 Creciendo', color: '#2D6A4F' },
  { value: 'muerto', label: '🍂 Muerto', color: '#9CA3AF' },
];

export default function ArbolDetalleScreen({ route, navigation }) {
  const { arbol: arbolInicial, parcelaId, parcelaNombre } = route.params;
  const [arbol, setArbol] = useState(arbolInicial);
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notasDraft, setNotasDraft] = useState(arbolInicial.notas || '');
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoNotas, setGuardandoNotas] = useState(false);

  const fotos = arbol.fotos?.length > 0 ? arbol.fotos : (arbol.foto_url ? [arbol.foto_url] : []);

  const handleAgregarFoto = async () => {
    Alert.alert('Agregar foto', '', [
      { text: 'Cámara', onPress: () => tomarFoto('camara') },
      { text: 'Galería', onPress: () => tomarFoto('galeria') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const tomarFoto = async (origen) => {
    const { status } = origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = origen === 'camara'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [4, 3] });

    if (result.canceled) return;

    setSubiendoFoto(true);
    try {
      const uid = auth.currentUser?.uid || 'anonimo';
      const url = await subirFotoArbol(uid, result.assets[0].uri);
      await api.agregarFotoArbol(parcelaId, arbol.id, url);
      setArbol((prev) => ({ ...prev, fotos: [...(prev.fotos || []), url] }));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleCambiarEstado = (nuevoEstado) => {
    Alert.alert('Cambiar estado', `¿Marcar como "${ESTADOS.find(e => e.value === nuevoEstado)?.label}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar', onPress: async () => {
          try {
            await api.actualizarArbol(parcelaId, arbol.id, { estado: nuevoEstado });
            setArbol((prev) => ({ ...prev, estado: nuevoEstado }));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleGuardarNotas = async () => {
    setGuardandoNotas(true);
    try {
      await api.actualizarArbol(parcelaId, arbol.id, { notas: notasDraft.trim() || null });
      setArbol((prev) => ({ ...prev, notas: notasDraft.trim() || null }));
      setEditandoNotas(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardandoNotas(false);
    }
  };

  const estadoActual = ESTADOS.find((e) => e.value === arbol.estado) || ESTADOS[0];

  const preguntaIA = `Tengo un árbol de ${arbol.especie}. Estado actual: ${estadoActual.label}. ${arbol.notas ? 'Notas: ' + arbol.notas + '.' : ''} ¿Qué cuidados necesita y cómo puedo mejorar su desarrollo?`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Galería de fotos */}
      {fotos.length > 0 ? (
        <View>
          <FlatList
            data={[...fotos, 'add']}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) =>
              item === 'add' ? (
                <TouchableOpacity style={styles.addFotoSlide} onPress={handleAgregarFoto}>
                  {subiendoFoto
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <Text style={styles.addFotoTxt}>📷{'\n'}Agregar foto</Text>}
                </TouchableOpacity>
              ) : (
                <Image source={{ uri: item }} style={styles.fotoSlide} />
              )
            }
          />
          <Text style={styles.fotoCount}>{fotos.length} foto{fotos.length > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.sinFotos} onPress={handleAgregarFoto}>
          {subiendoFoto
            ? <ActivityIndicator color={COLORS.primary} />
            : <>
                <Text style={styles.sinFotosIcon}>📷</Text>
                <Text style={styles.sinFotosTxt}>Agregar primera foto</Text>
              </>}
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.arbolEmoji}>🌳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.especie}>{arbol.especie}</Text>
            {parcelaNombre && <Text style={styles.parcelaNombre}>📍 {parcelaNombre}</Text>}
          </View>
        </View>

        {/* Estado */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado</Text>
          <View style={styles.estadoRow}>
            {ESTADOS.map((e) => (
              <TouchableOpacity
                key={e.value}
                style={[styles.estadoBtn, arbol.estado === e.value && { borderColor: e.color, backgroundColor: e.color + '20' }]}
                onPress={() => arbol.estado !== e.value && handleCambiarEstado(e.value)}
              >
                <Text style={[styles.estadoBtnTxt, arbol.estado === e.value && { color: e.color, fontWeight: '800' }]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Notas</Text>
            {!editandoNotas && (
              <TouchableOpacity onPress={() => { setNotasDraft(arbol.notas || ''); setEditandoNotas(true); }}>
                <Text style={styles.editarTxt}>✏️ Editar</Text>
              </TouchableOpacity>
            )}
          </View>
          {editandoNotas ? (
            <>
              <TextInput
                style={styles.notasInput}
                value={notasDraft}
                onChangeText={setNotasDraft}
                multiline
                numberOfLines={4}
                placeholder="Observaciones, riego, condiciones del suelo..."
                placeholderTextColor={COLORS.textSecondary}
                autoFocus
              />
              <View style={styles.notasBtns}>
                <TouchableOpacity onPress={() => setEditandoNotas(false)} style={styles.cancelarNotasBtn}>
                  <Text style={styles.cancelarNotasTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleGuardarNotas} style={styles.guardarNotasBtn} disabled={guardandoNotas}>
                  {guardandoNotas
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.guardarNotasTxt}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={arbol.notas ? styles.notasTxt : styles.notasVacio}>
              {arbol.notas || 'Sin notas. Tocá Editar para agregar observaciones.'}
            </Text>
          )}
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación</Text>
          <View style={styles.mapaWrapper}>
            <MapView
              style={styles.mapa}
              initialRegion={{ latitude: arbol.lat, longitude: arbol.lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: arbol.lat, longitude: arbol.lng }} anchor={{ x: 0.5, y: 1 }}>
                <Text style={{ fontSize: 28 }}>🌳</Text>
              </Marker>
            </MapView>
          </View>
          <Text style={styles.coordsTxt}>📍 {arbol.lat.toFixed(5)}, {arbol.lng.toFixed(5)}</Text>
        </View>

        {/* Consultar IA */}
        <TouchableOpacity
          style={styles.iaBtn}
          onPress={() => navigation.navigate('Main', {
            screen: 'Chat',
            params: { parcela_id: parcelaId, pregunta_inicial: preguntaIA },
          })}
        >
          <Text style={styles.iaBtnTxt}>🌿 Consultar IA sobre este árbol</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  fotoSlide: { width, height: 260, resizeMode: 'cover' },
  addFotoSlide: { width, height: 260, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  addFotoTxt: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 26 },
  fotoCount: { position: 'absolute', bottom: 10, right: 14, backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sinFotos: { height: 180, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sinFotosIcon: { fontSize: 40 },
  sinFotosTxt: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  content: { padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.white, borderRadius: 16, padding: 16 },
  arbolEmoji: { fontSize: 44 },
  especie: { fontSize: 20, fontWeight: '800', color: COLORS.primaryDark },
  parcelaNombre: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primaryDark },
  editarTxt: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  estadoRow: { flexDirection: 'row', gap: 8 },
  estadoBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  estadoBtnTxt: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  notasTxt: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  notasVacio: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  notasInput: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text, height: 100, textAlignVertical: 'top' },
  notasBtns: { flexDirection: 'row', gap: 8 },
  cancelarNotasBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  cancelarNotasTxt: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  guardarNotasBtn: { flex: 2, backgroundColor: COLORS.primary, borderRadius: 10, padding: 10, alignItems: 'center' },
  guardarNotasTxt: { fontSize: 14, color: '#fff', fontWeight: '700' },
  mapaWrapper: { borderRadius: 12, overflow: 'hidden' },
  mapa: { height: 150 },
  coordsTxt: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  iaBtn: { backgroundColor: COLORS.primaryDark, borderRadius: 12, padding: 16, alignItems: 'center' },
  iaBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
