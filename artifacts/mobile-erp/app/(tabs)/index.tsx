/**
 * Dashboard Screen — Main overview with stats, charts, quick actions
 */
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatCurrencyShort, getGreeting, formatRelativeTime } from '@/utils/formatters';
import type { DashboardStats, SalesByDay, Sale } from '@/database/repositories';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    try {
      const [s, days, sales] = await Promise.all([
        repos.reports.getDashboardStats(),
        repos.reports.getSalesByDay(7),
        repos.sales.list(),
      ]);
      setStats(s);
      setSalesByDay(days);
      setRecentSales(sales.slice(0, 5));
    } catch (e) {
      console.error('[Dashboard] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [repos]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const roleColors: Record<string, string> = { admin: colors.primary, manager: colors.success, salesperson: colors.warning, accountant: colors.info };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.full_name ?? 'User'}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: (roleColors[user?.role ?? ''] || colors.primary) + '22' }]}>
          <Text style={[styles.roleText, { color: roleColors[user?.role ?? ''] || colors.primary }]}>{(user?.role ?? '').toUpperCase()}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TODAY</Text>
        {loading ? <ActivityIndicator color={colors.primary} /> : stats ? (
          <View style={styles.statsGrid}>
            <StatCard title="Revenue" value={formatCurrency(stats.todayRevenue)} icon="dollar-sign" color={colors.primary} sub={`${stats.todaySalesCount} sales`} colors={colors} />
            <StatCard title="Month Revenue" value={formatCurrencyShort(stats.monthRevenue)} icon="trending-up" color={colors.success} sub={`${stats.monthSalesCount} sales`} colors={colors} />
            <StatCard title="Month Profit" value={formatCurrencyShort(stats.monthProfit)} icon="activity" color={stats.monthProfit >= 0 ? colors.success : colors.error} colors={colors} />
            <StatCard title="Low Stock" value={String(stats.lowStockCount)} icon="alert-triangle" color={stats.lowStockCount > 0 ? colors.warning : colors.success} sub={stats.lowStockCount > 0 ? 'Needs attention' : 'All good'} colors={colors} />
          </View>
        ) : null}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          {[
            { icon: 'shopping-cart' as const, label: 'New Sale', color: colors.primary, route: '/(tabs)/pos' },
            { icon: 'package' as const, label: 'Inventory', color: colors.warning, route: '/inventory' },
            { icon: 'bar-chart-2' as const, label: 'Reports', color: colors.success, route: '/reports' },
            { icon: 'users' as const, label: 'Customers', color: '#8B5CF6', route: '/(tabs)/customers' },
          ].map(a => (
            <TouchableOpacity key={a.label} style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(a.route as any)} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: a.color + '22' }]}>
                <Feather name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Revenue Chart */}
      {salesByDay.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LAST 7 DAYS</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(() => {
              const max = Math.max(...salesByDay.map(d => d.revenue), 1);
              return salesByDay.slice(-7).map(d => {
                const height = Math.max(4, (d.revenue / max) * 80);
                const dayLabel = new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3);
                return (
                  <View key={d.date} style={styles.bar}>
                    <Text style={[styles.barRev, { color: colors.textSecondary }]}>{d.revenue > 0 ? formatCurrencyShort(d.revenue) : ''}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.barDay, { color: colors.textSecondary }]}>{dayLabel}</Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>
      )}

      {/* Recent Sales */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECENT SALES</Text>
          <TouchableOpacity onPress={() => router.push('/sales-history' as any)}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {recentSales.length > 0 ? recentSales.map(sale => (
          <TouchableOpacity key={sale.id} style={[styles.saleCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/sale/${sale.id}` as any)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.saleInv, { color: colors.text }]}>{sale.invoice_number}</Text>
              <Text style={[styles.saleCust, { color: colors.textSecondary }]}>{sale.customer_name || 'Walk-in Customer'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.saleAmt, { color: colors.text }]}>{formatCurrency(sale.grand_total)}</Text>
              <Text style={[styles.saleTime, { color: colors.textMuted }]}>{formatRelativeTime(sale.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shopping-bag" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No sales yet</Text>
            <Text style={[styles.emptySubText, { color: colors.textMuted }]}>Start by making a sale in the POS</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color, sub, colors }: { title: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; sub?: string; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.textMuted }]}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  userName: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  roleText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  seeAll: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, gap: 6 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statTitle: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statSub: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 130 },
  bar: { flex: 1, alignItems: 'center', gap: 4 },
  barRev: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3 },
  barDay: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  saleCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  saleInv: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  saleCust: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  saleAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  saleTime: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  emptyState: { alignItems: 'center', padding: 32, borderRadius: 14, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptySubText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
});
