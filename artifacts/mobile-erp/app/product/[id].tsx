/**
 * Product Detail Screen — Full product info with stock history
 */
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Product, StockMovement } from '@/database/repositories';

export default function ProductDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos } = useDatabaseStatus();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const loadData = useCallback(async () => {
    if (!repos || !id) return;
    const p = await repos.products.getById(Number(id));
    setProduct(p);
    const m = await repos.inventory.getMovements(Number(id), 20);
    setMovements(m);
  }, [repos, id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!product) return <View style={[styles.root, { backgroundColor: colors.background }]}><Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 100 }}>Loading...</Text></View>;

  const stockColor = product.current_stock > product.reorder_level ? colors.success : product.current_stock > 0 ? colors.warning : colors.error;

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.prodIcon, { backgroundColor: colors.primary + '15' }]}>
          <Feather name="box" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.prodName, { color: colors.text }]}>{product.name}</Text>
        <Text style={[styles.prodMeta, { color: colors.textSecondary }]}>{product.category_name} • {product.brand_name || 'No brand'}</Text>
        {product.variant && <Text style={[styles.variant, { color: colors.textMuted }]}>{product.variant}</Text>}
      </View>

      {/* Price */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRICING</Text>
        <View style={styles.row}>
          <InfoItem label="Selling Price" value={formatCurrency(product.selling_price)} color={colors.primary} colors={colors} />
          <InfoItem label="Cost Price" value={formatCurrency(product.cost_price)} color={colors.textSecondary} colors={colors} />
        </View>
        <View style={styles.row}>
          <InfoItem label="GST Rate" value={`${product.gst_rate}%`} colors={colors} />
          <InfoItem label="Margin" value={`${(((product.selling_price - product.cost_price) / product.cost_price) * 100).toFixed(1)}%`} color={colors.success} colors={colors} />
        </View>
      </View>

      {/* Stock */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STOCK</Text>
        <View style={styles.row}>
          <InfoItem label="Current Stock" value={`${product.current_stock} ${product.unit}`} color={stockColor} colors={colors} />
          <InfoItem label="Reorder Level" value={`${product.reorder_level} ${product.unit}`} colors={colors} />
        </View>
        <View style={[styles.stockBar, { backgroundColor: colors.border }]}>
          <View style={[styles.stockFill, { width: `${Math.min(100, (product.current_stock / Math.max(product.reorder_level * 3, 1)) * 100)}%`, backgroundColor: stockColor }]} />
        </View>
      </View>

      {/* Details */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>
        <DetailRow label="SKU" value={product.sku} colors={colors} />
        <DetailRow label="Barcode" value={product.barcode || '—'} colors={colors} />
        <DetailRow label="Model" value={product.model || '—'} colors={colors} />
        <DetailRow label="Warranty" value={product.warranty_months > 0 ? `${product.warranty_months} months` : 'None'} colors={colors} />
        <DetailRow label="Supplier" value={product.supplier_name || '—'} colors={colors} />
        <DetailRow label="Status" value={product.is_active ? 'Active' : 'Inactive'} colors={colors} />
      </View>

      {/* Stock History */}
      {movements.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STOCK HISTORY</Text>
          {movements.map(m => (
            <View key={m.id} style={[styles.movementRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.moveIcon, { backgroundColor: m.movement_type === 'PURCHASE' ? colors.success + '22' : m.movement_type === 'SALE' ? colors.error + '22' : colors.info + '22' }]}>
                <Feather name={m.movement_type === 'PURCHASE' ? 'arrow-down' : m.movement_type === 'SALE' ? 'arrow-up' : 'refresh-cw'} size={14} color={m.movement_type === 'PURCHASE' ? colors.success : m.movement_type === 'SALE' ? colors.error : colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moveType, { color: colors.text }]}>{m.movement_type}</Text>
                <Text style={[styles.moveRef, { color: colors.textMuted }]}>{m.reference || m.notes || ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.moveQty, { color: m.movement_type === 'PURCHASE' ? colors.success : m.movement_type === 'SALE' ? colors.error : colors.text }]}>
                  {m.movement_type === 'PURCHASE' || m.movement_type === 'RETURN' ? '+' : '-'}{m.quantity}
                </Text>
                <Text style={[styles.moveDate, { color: colors.textMuted }]}>{formatDate(m.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoItem({ label, value, color, colors }: { label: string; value: string; color?: string; colors: any }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: color || colors.text }]}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 6 },
  prodIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  prodName: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  prodMeta: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  variant: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  section: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 16 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  stockBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  stockFill: { height: '100%', borderRadius: 3 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  movementRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5 },
  moveIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  moveType: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  moveRef: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  moveQty: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  moveDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
});
