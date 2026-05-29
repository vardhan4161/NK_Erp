/**
 * Sales History Screen — List all sales/invoices with filters
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import type { Sale } from '@/database/repositories';

export default function SalesHistoryScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const s = await repos.sales.list({ search: search || undefined });
    setSales(s); setRefreshing(false);
  }, [repos, search]);

  useEffect(() => { const t = setTimeout(loadData, 300); return () => clearTimeout(t); }, [loadData]);

  const statusColor = (s: string) => s === 'COMPLETED' ? colors.success : s === 'RETURNED' ? colors.error : colors.warning;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by invoice# or customer..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <FlatList
        data={sales}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={styles.empty}><Feather name="file-text" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No sales found</Text></View>}
        renderItem={({ item: s }) => (
          <TouchableOpacity style={[styles.saleCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/sale/${s.id}` as any)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.saleInv, { color: colors.text }]}>{s.invoice_number}</Text>
                <View style={[styles.badge, { backgroundColor: statusColor(s.status) + '22' }]}>
                  <Text style={[styles.badgeText, { color: statusColor(s.status) }]}>{s.status}</Text>
                </View>
              </View>
              <Text style={[styles.saleCust, { color: colors.textSecondary }]}>{s.customer_name || 'Walk-in Customer'}</Text>
              <Text style={[styles.saleDate, { color: colors.textMuted }]}>{formatDateTime(s.created_at)} • {s.payment_method}</Text>
            </View>
            <Text style={[styles.saleTotal, { color: colors.primary }]}>{formatCurrency(s.grand_total)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  saleCard: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  saleInv: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  saleCust: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saleDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saleTotal: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
