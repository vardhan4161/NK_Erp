/**
 * Inventory Screen — Consumer-style visual product catalog (Flipkart/Amazon style)
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency } from '@/utils/formatters';
import type { Category, Brand, Product } from '@/database/repositories';
import { CATEGORY_IMAGES } from '@/database/seedData';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width / 2 - 24;

const getCatIcon = (name: string) => {
    if (!name) return 'box';
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return 'smartphone';
    if (n.includes('laptop') || n.includes('computer')) return 'monitor';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('tv') || n.includes('television')) return 'tv';
    if (n.includes('watch')) return 'watch';
    if (n.includes('camera')) return 'camera';
    return 'box';
  };

export default function InventoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const cats = await repos.categories.list();
    setCategories(cats);
    setRefreshing(false);
  }, [repos]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadBrandsForCategory = async (cat: Category) => {
    setSelectedCat(cat);
    if (!repos) return;
    const allProducts = await repos.products.list({ categoryId: cat.id, isActive: true });
    const brandIds = Array.from(new Set(allProducts.map(p => p.brand_id).filter(Boolean)));
    const allBrands = await repos.brands.list();
    setBrands(allBrands.filter(b => brandIds.includes(b.id)));
    setProducts(allProducts);
  };

  const loadProductsForBrand = async (brand: Brand | null) => {
    setSelectedBrand(brand);
    if (!repos || !selectedCat) return;
    const allProducts = await repos.products.list({ 
      categoryId: selectedCat.id, 
      brandId: brand ? brand.id : undefined,
      isActive: true 
    });
    setProducts(allProducts);
  };

  const handleBack = () => {
    if (selectedBrand) setSelectedBrand(null);
    else if (selectedCat) setSelectedCat(null);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {(selectedCat || selectedBrand) && (
            <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: colors.text }]}>
            {!selectedCat ? 'Browse Categories' : selectedCat.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/product/add' as any)}>
          <Feather name="plus-circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
      >
        {/* Step 1: Categories */}
        {!selectedCat && (
          <View style={styles.grid}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => loadBrandsForCategory(cat)}
                activeOpacity={0.8}
              >
                <View style={[styles.catImage, { backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center' }]}>
                  <Feather name={getCatIcon(cat.name) as any} size={28} color={colors.primary} />
                </View>
                <View style={styles.catTextContainer}>
                  <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
                  <Text style={[styles.catCount, { color: colors.textMuted }]}>{cat.product_count} items</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Brands Filter (Horizontal Scroll) */}
        {selectedCat && brands.length > 0 && !selectedBrand && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 12 }}>Select Brand</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              <TouchableOpacity 
                style={[styles.brandChip, { backgroundColor: colors.card, borderColor: colors.primary }]}
                onPress={() => loadProductsForBrand(null)}
              >
                <Text style={[styles.brandName, { color: colors.primary }]}>All Brands</Text>
              </TouchableOpacity>
              {brands.map(brand => (
                <TouchableOpacity 
                  key={brand.id} 
                  style={[styles.brandChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => loadProductsForBrand(brand)}
                >
                  <Text style={[styles.brandName, { color: colors.text }]}>{brand.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Step 3: Products Grid */}
        {selectedCat && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text }}>
                {selectedBrand ? `${selectedBrand.name} Products` : 'All Products'}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{products.length} found</Text>
            </View>
            
            <View style={styles.grid}>
              {products.map(p => (
                <TouchableOpacity 
                  key={p.id} 
                  style={[styles.prodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/product/${p.id}` as any)}
                  activeOpacity={0.8}
                >
                  <View style={styles.prodImageContainer}>
                    <View style={[styles.prodImage, { backgroundColor: colors.border + '66', alignItems: 'center', justifyContent: 'center' }]}>
                    <Feather name={getCatIcon(selectedCat?.name || '') as any} size={30} color={colors.textSecondary} />
                  </View>
                    {p.current_stock <= p.reorder_level && (
                      <View style={[styles.badge, { backgroundColor: p.current_stock === 0 ? colors.error : colors.warning }]}>
                        <Text style={styles.badgeText}>{p.current_stock === 0 ? 'Out of Stock' : `Low: ${p.current_stock}`}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.prodInfo}>
                    <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                    <Text style={[styles.prodPrice, { color: colors.text }]}>{formatCurrency(p.selling_price)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  iconBtn: { padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  
  catCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  catImage: { width: '100%', height: 120 },
  catTextContainer: { padding: 12 },
  catName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  catCount: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  brandChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  brandName: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  prodCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prodImageContainer: { width: '100%', height: 120, position: 'relative' },
  prodImage: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Inter_700Bold' },
  prodInfo: { padding: 12 },
  prodName: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 8, height: 36 },
  prodPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
});
