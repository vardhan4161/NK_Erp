/**
 * Customer Detail Screen — Purchase history, warranty tracking, dues
 */
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/formatters';
import type { Customer, CustomerPurchase } from '@/database/repositories';

export default function CustomerDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos } = useDatabaseStatus();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [purchases, setPurchases] = useState<CustomerPurchase[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [tab, setTab] = useState<'purchases' | 'warranty'>('purchases');

  const loadData = useCallback(async () => {
    if (!repos || !id) return;
    const c = await repos.customers.getById(Number(id));
    setCustomer(c);
    const p = await repos.customers.getPurchaseHistory(Number(id));
    setPurchases(p);
    const w = await repos.customers.getWarrantyItems(Number(id));
    setWarranties(w);
  }, [repos, id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!customer) return <View style={[styles.root, { backgroundColor: colors.background }]}><Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 100 }}>Loading...</Text></View>;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{customer.name.charAt(0)}</Text>
        </View>
        <Text style={[styles.custName, { color: colors.text }]}>{customer.name}</Text>
        {customer.phone && <Text style={[styles.custInfo, { color: colors.textSecondary }]}>📱 {customer.phone}</Text>}
        {customer.email && <Text style={[styles.custInfo, { color: colors.textSecondary }]}>✉️ {customer.email}</Text>}
        {customer.address && <Text style={[styles.custInfo, { color: colors.textMuted }]}>📍 {customer.address}</Text>}
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{formatCurrency(customer.total_purchases)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Purchases</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: customer.due_amount > 0 ? colors.error : colors.success }]}>{formatCurrency(customer.due_amount)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Due Amount</Text>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {(['purchases', 'warranty'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, { backgroundColor: tab === t ? colors.primary : colors.card, borderColor: tab === t ? colors.primary : colors.border }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? '#FFF' : colors.textSecondary }]}>{t === 'purchases' ? `Purchases (${purchases.length})` : `Warranty (${warranties.length})`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {tab === 'purchases' && (purchases.length > 0 ? purchases.map(p => (
          <TouchableOpacity key={p.id} style={[styles.purchaseCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/sale/${p.id}` as any)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.purchaseInv, { color: colors.text }]}>{p.invoice_number}</Text>
              <Text style={[styles.purchaseDate, { color: colors.textMuted }]}>{formatDateTime(p.created_at)} • {p.payment_method}</Text>
            </View>
            <Text style={[styles.purchaseAmt, { color: colors.primary }]}>{formatCurrency(p.grand_total)}</Text>
          </TouchableOpacity>
        )) : <Text style={[styles.emptyText, { color: colors.textMuted }]}>No purchases yet</Text>)}

        {tab === 'warranty' && (warranties.length > 0 ? warranties.map((w, i) => {
          const purchaseDate = new Date(w.purchase_date);
          const expiryDate = new Date(purchaseDate); expiryDate.setMonth(expiryDate.getMonth() + w.warranty_months);
          const isActive = expiryDate > new Date();
          return (
            <View key={i} style={[styles.warrantyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.warrantyName, { color: colors.text }]}>{w.product_name}</Text>
                <Text style={[styles.warrantyInfo, { color: colors.textMuted }]}>{w.warranty_months} months • {w.invoice_number}</Text>
                <Text style={[styles.warrantyInfo, { color: colors.textMuted }]}>Expires: {formatDate(expiryDate.toISOString())}</Text>
              </View>
              <View style={[styles.warrantyBadge, { backgroundColor: isActive ? colors.success + '22' : colors.error + '22' }]}>
                <Text style={[styles.warrantyStatus, { color: isActive ? colors.success : colors.error }]}>{isActive ? 'Active' : 'Expired'}</Text>
              </View>
            </View>
          );
        }) : <Text style={[styles.emptyText, { color: colors.textMuted }]}>No warranty items</Text>)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  custName: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  custInfo: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 8 },
  purchaseCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  purchaseInv: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  purchaseDate: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  purchaseAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  warrantyCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  warrantyName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  warrantyInfo: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  warrantyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  warrantyStatus: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 20 },
});
