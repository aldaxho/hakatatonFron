import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { COLORS } from '../constants';
import { api } from '../services/api';
import RegistrarArbolModal from './RegistrarArbolModal';

function StatCard({ label, value, unit, color }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color || COLORS.primary }]}>
      <Text style={styles.statValue}>{value}<Text style={styles.statUnit}> {unit}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ParcelaDetalleScreen({ route, navigation }) {
  const { parcela } = route.params;
  const { resultado, poligono, modo, nombre } = parcela;

  const [mostrarPlan, setMostrarPlan] = useState(false);
  const [arbolesRegistrados, setArbolesRegistrados] = useState([]);
  const [loadingArboles, setLoadingArboles] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [planPuntoSeleccionado, setPlanPuntoSeleccionado] = useState(null);

  useEffect(() => {
    cargarArboles();
  }, []);

  const cargarArboles = async () => {
    try {
      const data = await api.getArboles(parcela.id);
      setArbolesRegistrados(data);
    } catch (e) {
      // Sin árboles registrados aún
    } finally {
      setLoadingArboles(false);
    }
  };

  const abrirModal = (planPunto = null) => {
    setPlanPuntoSeleccionado(planPunto);
    setModalVisible(true);
  };

  const onArbolGuardado = (arbol) => {
    setArbolesRegistrados((prev) => [...prev, arbol]);
  };

  const handleEliminarArbol = (arbol) => {
    Alert.alert('Eliminar árbol', `¿Eliminar el registro de "${arbol.especie}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await api.eliminarArbol(parcela.id, arbol.id);
            setArbolesRegistrados((prev) => prev.filter((a) => a.id !== arbol.id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const coords = poligono
    ? poligono.map((p) => ({ latitude: p[1] ?? p.lat, longitude: p[0] ?? p.lng }))
    : [];

  const allCoords = [
    ...coords,
    ...(resultado?.puntos || []).map((p) => ({ latitude: p.lat, longitude: p.lng })),
  ];
  const lats = allCoords.map((c) => c.latitude);
  const lngs = allCoords.map((c) => c.longitude);
  const mapRegion = allCoords.length > 0 ? {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 2, 0.005),
    longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 2, 0.005),
  } : { latitude: -17.7863, longitude: -63.1812, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  // Índices de puntos del plan ya registrados
  const idxRegistrados = new Set(arbolesRegistrados.map((a) => a.plan_punto_idx).filter((i) => i != null));
  const plantados = arbolesRegistrados.length;
  const totalPlan = resultado?.puntos?.length || 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Mapa */}
        {coords.length >= 3 && (
          <View style={styles.mapContainer}>
            <MapView style={styles.map} initialRegion={mapRegion}>
              <Polygon coordinates={coords} fillColor="rgba(45,106,79,0.2)" strokeColor={COLORS.primary} strokeWidth={2} />

              {/* Marcadores del plan */}
              {mostrarPlan && (resultado?.puntos || []).map((p, i) => {
                const yaPlantado = idxRegistrados.has(i);
                return (
                  <Marker
                    key={`plan-${i}`}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    title={p.especie}
                    description={yaPlantado ? '✅ Ya registrado' : 'Toca para registrar'}
                    anchor={{ x: 0.5, y: 1 }}
                    onCalloutPress={() => !yaPlantado && abrirModal({ ...p, idx: i })}
                  >
                    <View style={styles.markerPlan}>
                      <Text style={[styles.markerEmoji, yaPlantado && styles.markerEmojiDone]}>
                        {yaPlantado ? '✅' : '🌱'}
                      </Text>
                    </View>
                  </Marker>
                );
              })}

              {/* Árboles registrados por el usuario */}
              {arbolesRegistrados.map((a, i) => (
                <Marker
                  key={`reg-${i}`}
                  coordinate={{ latitude: a.lat, longitude: a.lng }}
                  title={a.especie}
                  description={`${a.estado} · ${a.notas || ''}`}
                  anchor={{ x: 0.5, y: 1 }}
                >
                  <View style={styles.markerRegistrado}>
                    <Text style={styles.markerEmoji}>🌳</Text>
                    <View style={styles.markerLabelGreen}>
                      <Text style={styles.markerLabelTxt} numberOfLines={1}>{a.especie.split(' ')[0]}</Text>
                    </View>
                  </View>
                </Marker>
              ))}
            </MapView>

            {/* Controles sobre el mapa */}
            <View style={styles.mapControls}>
              {totalPlan > 0 && (
                <TouchableOpacity
                  style={[styles.planToggle, mostrarPlan && styles.planToggleActive]}
                  onPress={() => setMostrarPlan((v) => !v)}
                >
                  <Text style={styles.planToggleTxt}>
                    {mostrarPlan ? '🌱 Ocultar plan' : '🌱 Ver plan IA'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => abrirModal(null)}>
                <Text style={styles.addBtnTxt}>+ Árbol</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Progreso de plantación */}
          {totalPlan > 0 && (
            <View style={styles.progresoCard}>
              <View style={styles.progresoHeader}>
                <Text style={styles.progresoTitulo}>Progreso de plantación</Text>
                <Text style={styles.progresoContador}>{plantados} / {totalPlan}</Text>
              </View>
              <View style={styles.progresoBarBg}>
                <View style={[styles.progresoBar, { width: `${Math.min(100, (plantados / totalPlan) * 100)}%` }]} />
              </View>
              <Text style={styles.progresoSub}>
                {plantados === 0 ? 'Aún no registraste árboles' :
                 plantados >= totalPlan ? '¡Plan completado! 🎉' :
                 `${totalPlan - plantados} árbol${totalPlan - plantados > 1 ? 'es' : ''} pendiente${totalPlan - plantados > 1 ? 's' : ''} del plan`}
              </Text>
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: modo === 'agro' ? '#FEF3C7' : '#DCFCE7' }]}>
              <Text style={[styles.badgeTxt, { color: modo === 'agro' ? '#92400E' : COLORS.primaryDark }]}>
                {modo === 'agro' ? '🌾 Modo Agro' : '🌿 Modo Ambiental'}
              </Text>
            </View>
            {resultado?.zona_quemada && (
              <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.badgeTxt, { color: '#991B1B' }]}>🔥 Zona quemada</Text>
              </View>
            )}
            {resultado?.hay_construccion && (
              <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.badgeTxt, { color: '#92400E' }]}>🏠 Construcción detectada</Text>
              </View>
            )}
          </View>

          {/* Plan IA */}
          {resultado?.recomendacion_texto && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan de plantación</Text>
              <Text style={styles.recomendacion}>{resultado.recomendacion_texto}</Text>
            </View>
          )}

          {/* Stats */}
          {resultado && (
            <View style={styles.statsGrid}>
              <StatCard label="NDVI del suelo" value={resultado.ndvi} unit="" color="#059669" />
              <StatCard label="Temp. proyectada" value={`-${resultado.reduccion_temp_suelo_c}`} unit="°C" color="#2563EB" />
              {modo === 'ambiental' ? (
                <>
                  <StatCard label="Cobertura sombra" value={resultado.cobertura_sombra_pct} unit="%" color={COLORS.primary} />
                  <StatCard label="CO2 anual" value={resultado.co2_estimado_kg_anual} unit="kg" color="#7C3AED" />
                </>
              ) : (
                <StatCard label="Ahorro agua" value={resultado.ahorro_agua_pct} unit="%" color="#0891B2" />
              )}
            </View>
          )}

          {/* Proyección */}
          {resultado?.proyeccion_crecimiento && (
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

          {/* Árboles registrados */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Mis árboles plantados</Text>
              <TouchableOpacity onPress={() => abrirModal(null)} style={styles.addSmallBtn}>
                <Text style={styles.addSmallBtnTxt}>+ Registrar</Text>
              </TouchableOpacity>
            </View>
            {loadingArboles ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : arbolesRegistrados.length === 0 ? (
              <Text style={styles.emptyArboles}>Aún no registraste árboles plantados en esta parcela.</Text>
            ) : (
              arbolesRegistrados.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.arbolRow}
                  onPress={() => navigation.navigate('ArbolDetalle', { arbol: a, parcelaId: parcela.id, parcelaNombre: nombre })}
                >
                  <Text style={styles.arbolIcon}>🌳</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.arbolNombre}>{a.especie}</Text>
                    <Text style={styles.arbolDetalle}>
                      {ESTADOS_LABEL[a.estado] || a.estado}
                      {a.notas ? ` · ${a.notas}` : ''}
                    </Text>
                  </View>
                  <View style={styles.arbolActions}>
                    <Text style={styles.arbolChevron}>›</Text>
                    <TouchableOpacity onPress={() => handleEliminarArbol(a)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.arbolDelete}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Cuidados */}
          {resultado?.cuidados?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cuidados recomendados</Text>
              {resultado.cuidados.map((c, i) => (
                <View key={i} style={styles.cuidadoRow}>
                  <Text style={styles.cuidadoNum}>{i + 1}</Text>
                  <Text style={styles.cuidadoTxt}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Chat */}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Chat', params: { parcela_id: parcela.id } })}
          >
            <Text style={styles.chatBtnTxt}>🌳 Consultar a la IA sobre esta parcela</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <RegistrarArbolModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onGuardado={onArbolGuardado}
        parcelaId={parcela.id}
        planPunto={planPuntoSeleccionado}
      />
    </View>
  );
}

const ESTADOS_LABEL = { plantado: '🌱 Plantado', creciendo: '🌿 Creciendo', muerto: '🍂 Muerto' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  mapContainer: { position: 'relative' },
  map: { height: 260 },
  mapControls: { position: 'absolute', bottom: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  planToggle: { backgroundColor: COLORS.primaryDark, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  planToggleActive: { backgroundColor: COLORS.primary },
  planToggleTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  addBtn: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
  markerPlan: { alignItems: 'center' },
  markerRegistrado: { alignItems: 'center' },
  markerEmoji: { fontSize: 26, opacity: 0.6 },
  markerEmojiDone: { opacity: 1 },
  markerLabelGreen: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, maxWidth: 80 },
  markerLabelTxt: { color: '#fff', fontSize: 9, fontWeight: '700' },
  content: { padding: 16, gap: 16 },
  progresoCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 8 },
  progresoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progresoTitulo: { fontSize: 15, fontWeight: '700', color: COLORS.primaryDark },
  progresoContador: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  progresoBarBg: { height: 8, backgroundColor: COLORS.background, borderRadius: 4 },
  progresoBar: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  progresoSub: { fontSize: 13, color: COLORS.textSecondary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  badgeTxt: { fontSize: 13, fontWeight: '700' },
  section: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primaryDark },
  addSmallBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addSmallBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
  emptyArboles: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  arbolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  arbolIcon: { fontSize: 22 },
  arbolNombre: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  arbolDetalle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  arbolActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arbolChevron: { fontSize: 22, color: COLORS.textSecondary },
  arbolDelete: { fontSize: 16, color: COLORS.error, padding: 4 },
  cuidadoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cuidadoNum: { backgroundColor: COLORS.primaryLight, color: '#fff', borderRadius: 12, width: 24, height: 24, textAlign: 'center', lineHeight: 24, fontSize: 13, fontWeight: '700' },
  cuidadoTxt: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  chatBtn: { backgroundColor: COLORS.primaryDark, borderRadius: 12, padding: 16, alignItems: 'center' },
  chatBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
