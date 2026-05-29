/**
 * Inventory Management Screen — Stock in, adjustments, movement history
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { StockMovement, Product } from '@/database/repositories';

export default function InventoryScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const { user } = useAuth();
  const [tab, setTab] = useState<'overview' | 'low' | 'stockin' | 'history'>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Stock In form
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');

  // Browse state variables for Stock In tab
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);

  // Load categories and brands for Stock In
  useEffect(() => {
    if (!repos) return;
    repos.categories.list().then(setCategories);
    repos.brands.list().then(setBrands);
  }, [repos]);

  // Load products based on Stock In selections
  useEffect(() => {
    if (!repos) return;
    if (selectedCategoryId !== null) {
      const filters: any = { categoryId: selectedCategoryId, isActive: true };
      if (selectedBrandId !== null && selectedBrandId !== 0) {
        filters.brandId = selectedBrandId;
      }
      repos.products.list(filters).then(setBrowseProducts);
    } else {
      setBrowseProducts([]);
    }
  }, [repos, selectedCategoryId, selectedBrandId]);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [s, l, m] = await Promise.all([
      repos.inventory.getSummary(),
      repos.inventory.getLowStock(),
      repos.inventory.getMovements(undefined, 50),
    ]);
    setSummary(s); setLowStock(l); setMovements(m); setRefreshing(false);
  }, [repos]);

  useEffect(() => { loadData(); }, [loadData]);

  const searchProducts = async (term: string) => {
    setSearchTerm(term);
    if (!repos || term.length < 2) { setSearchResults([]); return; }
    const results = await repos.products.list({ search: term });
    setSearchResults(results.slice(0, 10));
  };

  const handleStockIn = async () => {
    if (!repos || !selectedProduct || !qty) return;
    try {
      await repos.inventory.addStock(selectedProduct.id, parseInt(qty), notes || 'Stock purchase', user?.id);
      Alert.alert('Success ✅', `Added ${qty} units to ${selectedProduct.name}`);
      setSelectedProduct(null); setQty(''); setNotes(''); setSearchTerm(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: 'pie-chart' as const },
    { key: 'low' as const, label: 'Low Stock', icon: 'alert-triangle' as const },
    { key: 'stockin' as const, label: 'Stock In', icon: 'plus-circle' as const },
    { key: 'history' as const, label: 'History', icon: 'clock' as const },
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

      {tab === 'overview' && summary && (
        <View style={styles.content}>
          <View style={styles.statsRow}>
            {[
              { label: 'Total Products', value: String(summary.totalProducts), color: colors.primary },
              { label: 'Stock Value', value: formatCurrency(summary.totalStockValue), color: colors.success },
              { label: 'Low Stock', value: String(summary.lowStockCount), color: colors.warning },
              { label: 'Out of Stock', value: String(summary.outOfStockCount), color: colors.error },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {tab === 'low' && (
        <View style={styles.content}>
          {lowStock.length === 0 ? (
            <View style={styles.empty}><Feather name="check-circle" size={40} color={colors.success} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>All products are well-stocked!</Text></View>
          ) : lowStock.map(p => (
            <View key={p.id} style={[styles.lowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lowName, { color: colors.text }]}>{p.name}</Text>
                <Text style={[styles.lowSku, { color: colors.textMuted }]}>{p.sku} • {p.category_name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.lowStock, { color: p.current_stock === 0 ? colors.error : colors.warning }]}>{p.current_stock} pcs</Text>
                <Text style={[styles.lowReorder, { color: colors.textMuted }]}>Min: {p.reorder_level}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {tab === 'stockin' && (
        <View style={[styles.content, { gap: 12 }]}>
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.textSecondary }]}>ADD STOCK</Text>
            {!selectedProduct ? (
              <>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} 
                  placeholder="Search product name or SKU..." 
                  placeholderTextColor={colors.textMuted} 
                  value={searchTerm} 
                  onChangeText={searchProducts} 
                />
                
                {searchTerm.length > 0 ? (
                  searchResults.map(p => (
                    <TouchableOpacity key={p.id} style={[styles.resultItem, { borderColor: colors.border }]} onPress={() => { setSelectedProduct(p); setSearchResults([]); setSearchTerm(''); }}>
                      <Text style={[styles.resultName, { color: colors.text }]}>{p.name}</Text>
                      <Text style={[styles.resultSku, { color: colors.textMuted }]}>Stock: {p.current_stock} pcs</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <>
                    {selectedCategoryId === null ? (
                      <View style={{ gap: 12, marginTop: 8 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary }}>Or Browse by Category:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {categories.map(cat => (
                            <TouchableOpacity 
                              key={cat.id} 
                              style={[styles.miniChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                              onPress={() => { setSelectedCategoryId(cat.id); setSelectedBrandId(null); }}
                              activeOpacity={0.7}
                            >
                              <Text style={{ fontSize: 12, color: colors.text, fontFamily: 'Inter_500Medium' }}>{cat.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : selectedBrandId === null ? (
                      <View style={{ gap: 10, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.text }}>
                            Category: <Text style={{ color: colors.primary }}>{categories.find(c => c.id === selectedCategoryId)?.name || ''}</Text>
                          </Text>
                          <TouchableOpacity onPress={() => { setSelectedCategoryId(null); setSelectedBrandId(null); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="arrow-left" size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Change</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Inter_500Medium' }}>Select Brand:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          <TouchableOpacity 
                            style={[styles.miniChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '44' }]}
                            onPress={() => setSelectedBrandId(0)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 12, color: colors.primary, fontFamily: 'Inter_700Bold' }}>All Brands</Text>
                          </TouchableOpacity>
                          {brands.filter(b => new Set(browseProducts.map(p => p.brand_id).filter(Boolean)).has(b.id)).map(b => (
                            <TouchableOpacity 
                              key={b.id} 
                              style={[styles.miniChip, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                              onPress={() => setSelectedBrandId(b.id)}
                              activeOpacity={0.7}
                            >
                              <Text style={{ fontSize: 12, color: colors.text, fontFamily: 'Inter_500Medium' }}>{b.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ) : (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.text }} numberOfLines={1}>
                            {categories.find(c => c.id === selectedCategoryId)?.name || ''} • <Text style={{ color: colors.primary }}>{selectedBrandId === 0 ? 'All Brands' : brands.find(b => b.id === selectedBrandId)?.name || ''}</Text>
                          </Text>
                          <TouchableOpacity onPress={() => setSelectedBrandId(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="arrow-left" size={12} color={colors.primary} />
                            <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Change Brand</Text>
                          </TouchableOpacity>
                        </View>
                        
                        {browseProducts.length === 0 ? (
                          <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', paddingVertical: 8 }}>No products found.</Text>
                        ) : (
                          <ScrollView style={{ maxHeight: 220, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }} nestedScrollEnabled>
                            {browseProducts.map(p => (
                              <TouchableOpacity 
                                key={p.id} 
                                style={[styles.resultItem, { borderColor: colors.border }]} 
                                onPress={() => { 
                                  setSelectedProduct(p); 
                                  setSearchResults([]); 
                                  setSearchTerm(''); 
                                  setSelectedCategoryId(null);
                                  setSelectedBrandId(null);
                                }}
                              >
                                <Text style={[styles.resultName, { color: colors.text }]}>{p.name}</Text>
                                <Text style={[styles.resultSku, { color: colors.textMuted }]}>SKU: {p.sku} • Stock: {p.current_stock} pcs</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <View style={[styles.selectedProd, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={[styles.selectedName, { color: colors.text }]}>{selectedProduct.name}</Text>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)}><Feather name="x" size={18} color={colors.textMuted} /></TouchableOpacity>
                </View>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Quantity" placeholderTextColor={colors.textMuted} value={qty} onChangeText={setQty} keyboardType="numeric" />
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Notes (optional)" placeholderTextColor={colors.textMuted} value={notes} onChangeText={setNotes} />
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleStockIn}><Text style={styles.submitText}>Add Stock</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {tab === 'history' && (
        <View style={styles.content}>
          {movements.map(m => (
            <View key={m.id} style={[styles.moveCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.moveIcon, { backgroundColor: m.movement_type === 'PURCHASE' ? colors.success + '22' : m.movement_type === 'SALE' ? colors.error + '22' : colors.info + '22' }]}>
                <Feather name={m.movement_type === 'PURCHASE' ? 'arrow-down' : m.movement_type === 'SALE' ? 'arrow-up' : 'refresh-cw'} size={14} color={m.movement_type === 'PURCHASE' ? colors.success : m.movement_type === 'SALE' ? colors.error : colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.moveProd, { color: colors.text }]}>{m.product_name || 'Unknown'}</Text>
                <Text style={[styles.moveRef, { color: colors.textMuted }]}>{m.movement_type} • {m.reference || m.notes || ''}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.moveQty, { color: m.movement_type === 'PURCHASE' || m.movement_type === 'RETURN' ? colors.success : colors.error }]}>{m.movement_type === 'PURCHASE' || m.movement_type === 'RETURN' ? '+' : '-'}{m.quantity}</Text>
                <Text style={[styles.moveDate, { color: colors.textMuted }]}>{formatDate(m.created_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  content: { padding: 16, gap: 8 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, padding: 14, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  lowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  lowName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  lowSku: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  lowStock: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  lowReorder: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  formCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  formTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultItem: { padding: 10, borderBottomWidth: 0.5 },
  resultName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  resultSku: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  selectedProd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 10, borderWidth: 1 },
  selectedName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  submitBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  moveCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 10 },
  moveIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moveProd: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  moveRef: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  moveQty: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  moveDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  miniChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
});
