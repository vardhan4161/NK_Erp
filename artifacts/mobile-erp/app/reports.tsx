/**
 * Reports Screen — Sales, profit, GST, inventory analytics
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatCurrencyShort } from '@/utils/formatters';
import type { ProfitLoss, GstReport, TopProduct, CategorySales } from '@/database/repositories';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const [tab, setTab] = useState<'profit' | 'gst' | 'top' | 'category'>('profit');
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [gst, setGst] = useState<GstReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [catSales, setCatSales] = useState<CategorySales[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [p, g, t, c] = await Promise.all([
      repos.reports.getProfitLoss(),
      repos.reports.getGstReport(),
      repos.reports.getTopProducts(10),
      repos.reports.getCategorySales(),
    ]);
    setProfitLoss(p); setGst(g); setTopProducts(t); setCatSales(c); setRefreshing(false);
  }, [repos]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = [
    { key: 'profit' as const, label: 'Profit & Loss', icon: 'trending-up' as const },
    { key: 'gst' as const, label: 'GST', icon: 'file-text' as const },
    { key: 'top' as const, label: 'Top Products', icon: 'award' as const },
    { key: 'category' as const, label: 'Categories', icon: 'pie-chart' as const },
  ];

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tabs.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, { backgroundColor: tab === t.key ? colors.primary : colors.card, borderColor: tab === t.key ? colors.primary : colors.border }]} onPress={() => setTab(t.key)}>
              <Feather name={t.icon} size={14} color={tab === t.key ? '#FFF' : colors.textSecondary} />
              <Text style={[styles.tabText, { color: tab === t.key ? '#FFF' : colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.content}>
        {tab === 'profit' && profitLoss && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>PROFIT & LOSS</Text>
            <ReportRow label="Revenue" value={formatCurrency(profitLoss.revenue)} color={colors.text} colors={colors} />
            <ReportRow label="Cost of Goods" value={`-${formatCurrency(profitLoss.costOfGoods)}`} color={colors.error} colors={colors} />
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <ReportRow label="Gross Profit" value={formatCurrency(profitLoss.grossProfit)} color={profitLoss.grossProfit >= 0 ? colors.success : colors.error} colors={colors} bold />
            <ReportRow label="Gross Margin" value={`${profitLoss.grossMargin.toFixed(1)}%`} color={colors.textSecondary} colors={colors} />
            <ReportRow label="Expenses" value={`-${formatCurrency(profitLoss.totalExpenses)}`} color={colors.error} colors={colors} />
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <ReportRow label="Net Profit" value={formatCurrency(profitLoss.netProfit)} color={profitLoss.netProfit >= 0 ? colors.success : colors.error} colors={colors} bold />
            <ReportRow label="Net Margin" value={`${profitLoss.netMargin.toFixed(1)}%`} color={colors.textSecondary} colors={colors} />
          </View>
        )}

        {tab === 'gst' && gst && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>GST SUMMARY</Text>
            <ReportRow label="Total Sales" value={formatCurrency(gst.totalSales)} colors={colors} />
            <ReportRow label="Transactions" value={String(gst.transactionCount)} colors={colors} />
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <ReportRow label="CGST" value={formatCurrency(gst.totalCgst)} color={colors.primary} colors={colors} />
            <ReportRow label="SGST" value={formatCurrency(gst.totalSgst)} color={colors.primary} colors={colors} />
            <ReportRow label="IGST" value={formatCurrency(gst.totalIgst)} color={colors.primary} colors={colors} />
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <ReportRow label="Total GST" value={formatCurrency(gst.totalTax)} color={colors.warning} colors={colors} bold />
          </View>
        )}

        {tab === 'top' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>TOP SELLING PRODUCTS</Text>
            {topProducts.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sales data yet</Text>
            ) : topProducts.map((p, i) => (
              <View key={p.product_id} style={[styles.topRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rank, { color: i < 3 ? colors.primary : colors.textMuted }]}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topName, { color: colors.text }]}>{p.product_name}</Text>
                  <Text style={[styles.topSku, { color: colors.textMuted }]}>{p.sku} • {p.category_name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.topQty, { color: colors.text }]}>{p.quantity_sold} sold</Text>
                  <Text style={[styles.topRev, { color: colors.success }]}>{formatCurrencyShort(p.revenue)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === 'category' && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>CATEGORY-WISE SALES</Text>
            {catSales.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No sales data yet</Text>
            ) : catSales.map(c => (
              <View key={c.category_id} style={styles.catRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.catName, { color: colors.text }]}>{c.category_name}</Text>
                  <View style={[styles.catBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.catFill, { width: `${c.percentage}%`, backgroundColor: colors.primary }]} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.catRev, { color: colors.text }]}>{formatCurrencyShort(c.revenue)}</Text>
                  <Text style={[styles.catPct, { color: colors.textMuted }]}>{c.percentage.toFixed(1)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ReportRow({ label, value, color, bold, colors }: any) {
  return (
    <View style={styles.reportRow}>
      <Text style={[styles.reportLabel, { color: colors.textSecondary }, bold && { fontFamily: 'Inter_700Bold', color: colors.text }]}>{label}</Text>
      <Text style={[styles.reportValue, { color: color || colors.text }, bold && { fontFamily: 'Inter_700Bold', fontSize: 16 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  cardTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  reportLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  reportValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5 },
  rank: { fontSize: 14, fontFamily: 'Inter_700Bold', width: 28 },
  topName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  topSku: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  topQty: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  topRev: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  catName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  catBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catFill: { height: '100%', borderRadius: 3 },
  catRev: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  catPct: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
