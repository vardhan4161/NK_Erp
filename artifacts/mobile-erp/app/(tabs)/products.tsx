/**
 * Products Screen — Browse, search, filter products
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency } from '@/utils/formatters';
import { ProductImage } from '@/components/ProductImage';
import type { Product, Category } from '@/database/repositories';

export default function ProductsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | undefined>();
  const [showLowStock, setShowLowStock] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [prods, cats] = await Promise.all([
      repos.products.list({ search: search || undefined, categoryId: selectedCat, lowStock: showLowStock || undefined }),
      repos.categories.list(),
    ]);
    setProducts(prods);
    setCategories(cats);
    setRefreshing(false);
  }, [repos, search, selectedCat, showLowStock]);

  useEffect(() => {
    const t = setTimeout(loadData, 300);
    return () => clearTimeout(t);
  }, [loadData]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/product/add' as any)}>
          <Feather name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search products..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      {/* Filter Chips */}
      <FlatList
        horizontal
        data={[{ id: 0, name: 'All' }, ...categories]}
        keyExtractor={c => String(c.id)}
        style={[styles.chips, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: c }) => {
          const active = c.id === 0 ? !selectedCat : selectedCat === c.id;
          return (
            <TouchableOpacity style={[styles.chip, { backgroundColor: active ? colors.primary : colors.inputBg, borderColor: active ? colors.primary : colors.border }]} onPress={() => setSelectedCat(c.id === 0 ? undefined : c.id)}>
              <Text style={[styles.chipText, { color: active ? '#FFF' : colors.textSecondary }]}>{c.name}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Low stock toggle */}
      <TouchableOpacity style={[styles.lowStockToggle, { backgroundColor: showLowStock ? colors.warning + '22' : colors.card, borderColor: showLowStock ? colors.warning : colors.border }]} onPress={() => setShowLowStock(!showLowStock)}>
        <Feather name="alert-triangle" size={14} color={showLowStock ? colors.warning : colors.textMuted} />
        <Text style={[styles.lowStockText, { color: showLowStock ? colors.warning : colors.textSecondary }]}>Low Stock Only</Text>
      </TouchableOpacity>

      <FlatList
        data={products}
        keyExtractor={p => String(p.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}><Feather name="package" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products found</Text></View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity style={[styles.prodCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/product/${p.id}` as any)} activeOpacity={0.7}>
            <ProductImage imageUri={p.image_uri} categoryName={p.category_name} size={48} borderRadius={10} backgroundColor={colors.primary + '15'} iconColor={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.prodMeta, { color: colors.textSecondary }]}>{p.category_name} • {p.brand_name || 'No brand'}</Text>
              <Text style={[styles.prodSku, { color: colors.textMuted }]}>{p.sku}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.prodPrice, { color: colors.text }]}>{formatCurrency(p.selling_price)}</Text>
              <View style={[styles.stockBadge, {
                backgroundColor: p.current_stock > p.reorder_level ? colors.success + '22' : p.current_stock > 0 ? colors.warning + '22' : colors.error + '22'
              }]}>
                <Text style={[styles.stockText, {
                  color: p.current_stock > p.reorder_level ? colors.success : p.current_stock > 0 ? colors.warning : colors.error
                }]}>{p.current_stock} {p.unit}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  chips: { maxHeight: 50, borderBottomWidth: 1, paddingVertical: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  lowStockToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  lowStockText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  prodCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  prodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  prodName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  prodMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  prodSku: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  prodPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  stockText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
});
