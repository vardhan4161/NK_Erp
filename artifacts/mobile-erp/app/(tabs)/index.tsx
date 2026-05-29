/**
 * Dashboard Screen — Main overview with stats, charts, quick actions
 * Stat cards are clickable and open detail sheets
 */
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatCurrencyShort, getGreeting, formatRelativeTime } from '@/utils/formatters';
import type { DashboardStats, SalesByDay, Sale } from '@/database/repositories';

type DetailModalType = 'today' | 'month' | 'profit' | 'lowstock' | null;

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
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [detailSales, setDetailSales] = useState<Sale[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDetail = async (type: DetailModalType) => {
    if (!repos || !type) return;
    setDetailModal(type);
    setDetailLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0];

      if (type === 'today') {
        const sales = await repos.sales.list({ fromDate: today, toDate: today });
        setDetailSales(sales);
      } else if (type === 'month') {
        const sales = await repos.sales.list({ fromDate: monthStart });
        setDetailSales(sales);
      } else if (type === 'profit') {
        const sales = await repos.sales.list({ fromDate: monthStart });
        setDetailSales(sales);
      } else if (type === 'lowstock') {
        // navigate directly to inventory low-stock page
        setDetailModal(null);
        router.push('/inventory' as any);
        return;
      }
    } catch (e) {
      console.error('[Dashboard] Detail error:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: colors.primary,
    manager: colors.success,
    salesperson: colors.warning,
    accountant: colors.info,
  };

  const modalTitle = detailModal === 'today' ? "Today's Sales"
    : detailModal === 'month' ? 'This Month — All Sales'
    : detailModal === 'profit' ? 'Monthly Profit Breakdown'
    : '';

  const totalDetailRevenue = detailSales.reduce((s, x) => s + (x.grand_total || 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={styles.root}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => { setRefreshing(true); loadData(); }} style={{ padding: 6 }}>
              <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.roleBadge, { backgroundColor: (roleColors[user?.role ?? ''] || colors.primary) + '22' }]}>
              <Text style={[styles.roleText, { color: roleColors[user?.role ?? ''] || colors.primary }]}>{(user?.role ?? '').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TAP A CARD FOR DETAILS</Text>
          {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} /> : stats ? (
            <View style={styles.statsGrid}>
              <StatCard
                title="Today's Revenue"
                value={formatCurrency(stats.todayRevenue)}
                icon="dollar-sign"
                color={colors.primary}
                sub={`${stats.todaySalesCount} sale${stats.todaySalesCount !== 1 ? 's' : ''} today`}
                hint="Tap to see today's transactions"
                colors={colors}
                onPress={() => openDetail('today')}
              />
              <StatCard
                title="Month Revenue"
                value={formatCurrencyShort(stats.monthRevenue)}
                icon="trending-up"
                color={colors.success}
                sub={`${stats.monthSalesCount} sales this month`}
                hint="Tap to view all month's sales"
                colors={colors}
                onPress={() => openDetail('month')}
              />
              <StatCard
                title="Month Profit"
                value={formatCurrencyShort(stats.monthProfit)}
                icon="activity"
                color={stats.monthProfit >= 0 ? colors.success : colors.error}
                sub={stats.monthProfit >= 0 ? 'Profitable ✓' : 'Loss this month'}
                hint="Tap for P&L breakdown"
                colors={colors}
                onPress={() => openDetail('profit')}
              />
              <StatCard
                title="Low Stock"
                value={String(stats.lowStockCount)}
                icon="alert-triangle"
                color={stats.lowStockCount > 0 ? colors.warning : colors.success}
                sub={stats.lowStockCount > 0 ? 'Items need restocking' : 'All stock is good'}
                hint="Tap to see low-stock items"
                colors={colors}
                onPress={() => openDetail('lowstock')}
              />
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

      {/* Detail Modal */}
      <Modal visible={detailModal !== null && detailModal !== 'lowstock'} animationType="slide" transparent onRequestClose={() => setDetailModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}>
                <Feather name="x" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <ActivityIndicator color={colors.primary} style={{ margin: 40 }} />
            ) : (
              <>
                {/* Summary Row */}
                {detailModal === 'profit' && stats ? (
                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginBottom: 4 }]}>THIS MONTH</Text>
                    {[
                      { label: 'Total Revenue', value: formatCurrency(stats.monthRevenue), color: colors.success },
                      { label: 'Cost of Goods', value: `- ${formatCurrency(stats.monthRevenue - stats.monthProfit - stats.monthExpenses)}`, color: colors.error },
                      { label: 'Expenses', value: `- ${formatCurrency(stats.monthExpenses)}`, color: colors.error },
                      { label: 'Net Profit', value: formatCurrency(stats.monthProfit), color: stats.monthProfit >= 0 ? colors.success : colors.error, bold: true },
                    ].map(row => (
                      <View key={row.label} style={[styles.profitRow, { borderBottomColor: colors.border }]}>
                        <Text style={[styles.profitLabel, { color: colors.textSecondary, fontFamily: row.bold ? 'Inter_700Bold' : 'Inter_400Regular' }]}>{row.label}</Text>
                        <Text style={[styles.profitValue, { color: row.color, fontFamily: row.bold ? 'Inter_700Bold' : 'Inter_600SemiBold' }]}>{row.value}</Text>
                      </View>
                    ))}

                    <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 4 }]}>THIS MONTH'S SALES ({detailSales.length})</Text>
                    {detailSales.map(sale => (
                      <TouchableOpacity key={sale.id} style={[styles.saleRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => { setDetailModal(null); router.push(`/sale/${sale.id}` as any); }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text }}>{sale.invoice_number}</Text>
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>{sale.customer_name || 'Walk-in'} • {new Date(sale.created_at).toLocaleDateString('en-IN')}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatCurrency(sale.grand_total)}</Text>
                      </TouchableOpacity>
                    ))}
                    {detailSales.length === 0 && <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No sales this month</Text>}
                  </ScrollView>
                ) : (
                  <>
                    <View style={[styles.summaryBanner, { backgroundColor: colors.primary + '15', borderBottomColor: colors.border }]}>
                      <Text style={{ fontSize: 13, fontFamily: 'Inter_500Medium', color: colors.textSecondary }}>
                        {detailModal === 'today' ? 'Total collected today' : 'Total this month'}
                      </Text>
                      <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatCurrency(totalDetailRevenue)}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{detailSales.length} transaction{detailSales.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <FlatList
                      data={detailSales}
                      keyExtractor={s => String(s.id)}
                      contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 30 }}
                      ListEmptyComponent={<Text style={{ color: colors.textMuted, textAlign: 'center', padding: 30, fontFamily: 'Inter_400Regular' }}>No transactions found</Text>}
                      renderItem={({ item: sale }) => (
                        <TouchableOpacity style={[styles.saleRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => { setDetailModal(null); router.push(`/sale/${sale.id}` as any); }}>
                          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center' }}>
                            <Feather name="receipt" size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text }}>{sale.invoice_number}</Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                              {sale.customer_name || 'Walk-in Customer'} • {sale.payment_method}
                            </Text>
                            <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>{formatRelativeTime(sale.created_at)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 15, fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatCurrency(sale.grand_total)}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: sale.status === 'COMPLETED' ? colors.success + '20' : colors.warning + '20' }]}>
                              <Text style={{ fontSize: 9, fontFamily: 'Inter_600SemiBold', color: sale.status === 'COMPLETED' ? colors.success : colors.warning }}>{sale.status}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ title, value, icon, color, sub, hint, colors, onPress }: {
  title: string; value: string; icon: keyof typeof Feather.glyphMap;
  color: string; sub?: string; hint?: string; colors: any; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onPress} activeOpacity={0.75}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
          <Feather name={icon} size={16} color={color} />
        </View>
        <Feather name="chevron-right" size={12} color={colors.textMuted} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      {sub && <Text style={[styles.statSub, { color: colors.textMuted }]}>{sub}</Text>}
      {hint && <Text style={[{ fontSize: 9, fontFamily: 'Inter_400Regular', color: color, marginTop: 2 }]}>{hint}</Text>}
    </TouchableOpacity>
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
  statCard: { width: '48%', flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, gap: 5 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 2 },
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
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  summaryBanner: { padding: 18, alignItems: 'center', gap: 4, borderBottomWidth: 1 },
  saleRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 3 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  profitLabel: { fontSize: 14 },
  profitValue: { fontSize: 14 },
});
