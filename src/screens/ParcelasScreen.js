import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { COLORS } from '../constants';

function ParcelaCard({ parcela, onPress, onDelete }) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(parcela)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardNombre}>{parcela.nombre}</Text>
        <Text style={[styles.modeBadge, { backgroundColor: parcela.modo === 'agro' ? '#FEF3C7' : '#DCFCE7' }]}>
          {parcela.modo === 'agro' ? '🌾 Agro' : '🌿 Ambiental'}
        </Text>
      </View>
      {parcela.resultado && (
        <View style={styles.cardStats}>
          {parcela.modo === 'ambiental' ? (
            <>
              <Text style={styles.stat}>🌳 {parcela.resultado.puntos?.length || 0} árboles</Text>
              <Text style={styles.stat}>☁️ {parcela.resultado.co2_estimado_kg_anual} kg CO2/año</Text>
            </>
          ) : (
            <>
              <Text style={styles.stat}>🌳 {parcela.resultado.puntos?.length || 0} árboles</Text>
              <Text style={styles.stat}>💧 {parcela.resultado.ahorro_agua_pct}% ahorro agua</Text>
            </>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(parcela.id)}>
        <Text style={styles.deleteTxt}>Eliminar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ParcelasScreen({ navigation }) {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchParcelas = async () => {
    try {
      const data = await api.getParcelas();
      setParcelas(data);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchParcelas(); }, []));

  const handleDelete = (id) => {
    Alert.alert('Eliminar parcela', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteParcela(id);
            setParcelas((prev) => prev.filter((p) => p.id !== id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={parcelas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ParcelaCard
            parcela={item}
            onPress={(p) => navigation.navigate('ParcelaDetalle', { parcela: p })}
            onDelete={handleDelete}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchParcelas(); }} tintColor={COLORS.primary} />}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyTitle}>No hay parcelas guardadas</Text>
            <Text style={styles.emptySubtitle}>Analizá un terreno y guardá los resultados</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardNombre: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1 },
  modeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  cardStats: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 13, color: COLORS.textSecondary },
  deleteBtn: { alignSelf: 'flex-end' },
  deleteTxt: { color: COLORS.error, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});
