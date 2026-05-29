/**
 * Reports Screen — Sales, profit, GST, inventory analytics
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatCurrencyShort } from '@/utils/formatters';
import type { ProfitLoss, GstReport, TopProduct, CategorySales } from '@/database/repositories';
import { ExportService } from '@/services/ExportService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const [tab, setTab] = useState<'profit' | 'gst' | 'top' | 'category'>('profit');
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [gst, setGst] = useState<GstReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [catSales, setCatSales] = useState<CategorySales[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

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

  const handleExport = async (format: 'excel' | 'pdf') => {
    setShowExportOptions(false);
    try {
      if (tab === 'profit' && profitLoss) {
        const data = [{ 
          Revenue: profitLoss.revenue, 
          'Cost of Goods': profitLoss.costOfGoods, 
          'Gross Profit': profitLoss.grossProfit, 
          'Gross Margin %': profitLoss.grossMargin,
          Expenses: profitLoss.totalExpenses,
          'Net Profit': profitLoss.netProfit,
          'Net Margin %': profitLoss.netMargin 
        }];
        if (format === 'excel') await ExportService.exportToExcel(data, 'Profit_Loss_Report');
        else await ExportService.exportToPdf(ExportService.generateGenericHtmlReport('Profit & Loss Report', data), 'Profit_Loss_Report');
      } else if (tab === 'gst' && gst) {
        const data = [{ 
          'Total Sales': gst.totalSales, 
          Transactions: gst.transactionCount, 
          CGST: gst.totalCgst, 
          SGST: gst.totalSgst, 
          IGST: gst.totalIgst, 
          'Total Tax': gst.totalTax 
        }];
        if (format === 'excel') await ExportService.exportToExcel(data, 'GST_Report');
        else await ExportService.exportToPdf(ExportService.generateGenericHtmlReport('GST Report', data), 'GST_Report');
      } else if (tab === 'top' && topProducts.length > 0) {
        const data = topProducts.map(p => ({
          Product: p.product_name,
          SKU: p.sku,
          Category: p.category_name,
          'Quantity Sold': p.quantity_sold,
          Revenue: p.revenue
        }));
        if (format === 'excel') await ExportService.exportToExcel(data, 'Top_Products_Report');
        else await ExportService.exportToPdf(ExportService.generateGenericHtmlReport('Top Products Report', data), 'Top_Products_Report');
      } else if (tab === 'category' && catSales.length > 0) {
        const data = catSales.map(c => ({
          Category: c.category_name,
          'Quantity Sold': c.quantity_sold,
          Revenue: c.revenue,
          'Percentage %': c.percentage
        }));
        if (format === 'excel') await ExportService.exportToExcel(data, 'Category_Sales_Report');
        else await ExportService.exportToPdf(ExportService.generateGenericHtmlReport('Category Sales Report', data), 'Category_Sales_Report');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const tabs = [
    { key: 'profit' as const, label: 'Profit & Loss', icon: 'trending-up' as const },
    { key: 'gst' as const, label: 'GST', icon: 'file-text' as const },
    { key: 'top' as const, label: 'Top Products', icon: 'award' as const },
    { key: 'category' as const, label: 'Categories', icon: 'pie-chart' as const },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.text }}>Reports</Text>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.inputBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border }} onPress={() => setShowExportOptions(true)}>
          <Feather name="download" size={14} color={colors.text} />
          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text }}>Export</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}>
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
      
      {/* Export Options Modal */}
      <Modal visible={showExportOptions} transparent animationType="fade" onRequestClose={() => setShowExportOptions(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text }}>Export Report</Text>
              <TouchableOpacity onPress={() => setShowExportOptions(false)}><Feather name="x" size={20} color={colors.text} /></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, fontFamily: 'Inter_400Regular', color: colors.textSecondary, marginBottom: 20 }}>
              Choose format to export the current {tab} report:
            </Text>
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.success + '22', borderRadius: 12, borderWidth: 1, borderColor: colors.success }} onPress={() => handleExport('excel')}>
                <Feather name="file" size={20} color={colors.success} />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.success }}>Export as Excel (.xlsx)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.error + '22', borderRadius: 12, borderWidth: 1, borderColor: colors.error }} onPress={() => handleExport('pdf')}>
                <Feather name="file-text" size={20} color={colors.error} />
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.error }}>Export as PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
