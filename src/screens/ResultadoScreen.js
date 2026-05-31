import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { api } from '../services/api';
import { COLORS } from '../constants';

function StatCard({ label, value, unit, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color || COLORS.primary }]}>
      <Text style={styles.statValue}>{value}<Text style={styles.statUnit}> {unit}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ResultadoScreen({ route, navigation }) {
  const { resultado, poligono, modo } = route.params;
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [saved, setSaved] = useState(false);

  const allCoords = [
    ...poligono,
    ...resultado.puntos.map((p) => ({ latitude: p.lat, longitude: p.lng })),
  ];
  const lats = allCoords.map((c) => c.latitude);
  const lngs = allCoords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const mapRegion = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 2, 0.005),
    longitudeDelta: Math.max((maxLng - minLng) * 2, 0.005),
  };

  const handleSave = async () => {
    if (!nombre.trim()) return Alert.alert('Poné un nombre', 'Ingresá un nombre para guardar la parcela.');
    setSaving(true);
    try {
      await api.saveParcela({
        nombre,
        poligono: poligono.map((p) => [p.longitude, p.latitude]),
        modo,
        cultivo: resultado.modo === 'agro' ? route.params.cultivo : undefined,
        resultado,
      });
      setSaved(true);
      Alert.alert('Guardado', 'Tu parcela fue guardada exitosamente.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Mapa con resultado */}
      <MapView style={styles.map} initialRegion={mapRegion}>
        <Polygon coordinates={poligono} fillColor="rgba(45,106,79,0.2)" strokeColor={COLORS.primary} strokeWidth={2} />
        {resultado.puntos.map((p, i) => (
          <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.especie} description={p.posicion} anchor={{ x: 0.5, y: 1 }}>
            <View style={styles.treeMarker}>
              <Text style={styles.treeEmoji}>🌳</Text>
              <View style={styles.treeLabel}>
                <Text style={styles.treeLabelTxt} numberOfLines={1}>{p.especie.split(' ')[0]}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.content}>
        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: modo === 'agro' ? '#FEF3C7' : '#DCFCE7' }]}>
            <Text style={[styles.badgeTxt, { color: modo === 'agro' ? '#92400E' : COLORS.primaryDark }]}>
              {modo === 'agro' ? '🌾 Modo Agro' : '🌿 Modo Ambiental'}
            </Text>
          </View>
          {resultado.zona_quemada && (
            <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
              <Text style={[styles.badgeTxt, { color: '#991B1B' }]}>🔥 Zona quemada</Text>
            </View>
          )}
          {resultado.hay_construccion && (
            <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.badgeTxt, { color: '#92400E' }]}>🏠 Construcción detectada</Text>
            </View>
          )}
        </View>

        {/* Recomendación IA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recomendación</Text>
          <Text style={styles.recomendacion}>{resultado.recomendacion_texto}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="NDVI del suelo" value={resultado.ndvi} unit="" color="#059669" />
          <StatCard label="Temp. proyectada" value={`-${resultado.reduccion_temp_suelo_c}`} unit="°C" color="#2563EB" />
          {modo === 'ambiental' ? (
            <>
              <StatCard label="Cobertura sombra" value={resultado.cobertura_sombra_pct} unit="%" color={COLORS.primary} />
              <StatCard label="CO2 anual" value={resultado.co2_estimado_kg_anual} unit="kg" color="#7C3AED" />
            </>
          ) : (
            <>
              <StatCard label="Ahorro agua" value={resultado.ahorro_agua_pct} unit="%" color="#0891B2" />
            </>
          )}
        </View>

        {/* Proyección de crecimiento */}
        {resultado.proyeccion_crecimiento && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proyección de crecimiento</Text>
            <View style={styles.proyeccionRow}>
              {Object.entries(resultado.proyeccion_crecimiento).map(([anio, data]) => (
                <View key={anio} style={styles.proyeccionCard}>
                  <Text style={styles.proyeccionAnio}>{anio.replace('año_', '')} año{anio !== 'año_1' ? 's' : ''}</Text>
                  <Text style={styles.proyeccionAltura}>{data.altura_media_m}m</Text>
                  <Text style={styles.proyeccionCobertura}>{data.cobertura_pct}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Árboles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Árboles recomendados</Text>
          {resultado.puntos.map((p, i) => (
            <View key={i} style={styles.arbolRow}>
              <Text style={styles.arbolIcon}>🌳</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.arbolNombre}>{p.especie}</Text>
                <Text style={styles.arbolDetalle}>{p.posicion} · {p.distancia_borde_m}m del borde</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Cuidados */}
        {resultado.cuidados?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cuidados</Text>
            {resultado.cuidados.map((c, i) => (
              <View key={i} style={styles.cuidadoRow}>
                <Text style={styles.cuidadoNum}>{i + 1}</Text>
                <Text style={styles.cuidadoTxt}>{c}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Guardar parcela */}
        {!saved && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardar parcela</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de la parcela"
              placeholderTextColor={COLORS.textSecondary}
              value={nombre}
              onChangeText={setNombre}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnTxt}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { height: 220 },
  content: { padding: 16, gap: 16 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeTxt: { fontSize: 13, fontWeight: '700' },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
  recomendacion: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, flex: 1, minWidth: '45%', borderLeftWidth: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  statUnit: { fontSize: 14, fontWeight: '400' },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  proyeccionRow: { flexDirection: 'row', gap: 8 },
  proyeccionCard: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10, padding: 10, alignItems: 'center' },
  proyeccionAnio: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  proyeccionAltura: { fontSize: 18, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  proyeccionCobertura: { fontSize: 12, color: COLORS.textSecondary },
  arbolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  arbolIcon: { fontSize: 24 },
  arbolNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  arbolDetalle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  cuidadoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cuidadoNum: { backgroundColor: COLORS.primaryLight, color: '#fff', borderRadius: 12, width: 24, height: 24, textAlign: 'center', lineHeight: 24, fontSize: 13, fontWeight: '700' },
  cuidadoTxt: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  treeMarker: { alignItems: 'center' },
  treeEmoji: { fontSize: 30 },
  treeLabel: { backgroundColor: COLORS.primaryDark, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, maxWidth: 80 },
  treeLabelTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
