import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { ProductImage } from '@/components/ProductImage';
import type { Product, Category, Brand } from '@/database/repositories';

export default function POSScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const { user } = useAuth();
  const cart = useCart();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountPaid, setAmountPaid] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [successSale, setSuccessSale] = useState<any>(null);
  const [applyGst, setApplyGst] = useState(false);

  const computedGrandTotal = cart.subtotal + (applyGst ? cart.totalTax : 0) - (parseFloat(discountText) || 0);

  // Synchronize amountPaid with grandTotal
  useEffect(() => {
    setAmountPaid(computedGrandTotal > 0 ? computedGrandTotal.toString() : '0');
  }, [computedGrandTotal]);

  // Browse state variables
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [browseProducts, setBrowseProducts] = useState<Product[]>([]);

  // Load categories and brands
  useEffect(() => {
    if (!repos) return;
    repos.categories.list().then(setCategories);
    repos.brands.list().then(setBrands);
  }, [repos]);

  // Load products based on Category and Brand selections
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

  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || '';
  const selectedBrandName = selectedBrandId === 0 ? 'All Brands' : brands.find(b => b.id === selectedBrandId)?.name || '';

  const searchProducts = useCallback(async (term: string) => {
    if (!repos || term.length < 1) { setProducts([]); return; }
    const results = await repos.products.list({ search: term, isActive: true });
    setProducts(results.slice(0, 20));
  }, [repos]);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Browse UI Renderers
  const renderCategoriesGrid = () => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
      <View style={{ gap: 4, marginBottom: 4 }}>
        <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text }}>Browse Categories</Text>
        <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>Select a category to view its brands</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {categories.map(cat => {
          const bgColors = [colors.primary + '18', colors.success + '18', colors.warning + '18', colors.error + '18', '#A855F718', '#EC489918'];
          const idx = cat.id % bgColors.length;
          return (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setSelectedCategoryId(cat.id); setSelectedBrandId(null); }}
              activeOpacity={0.7}
            >
              <ProductImage imageUri={cat.image_uri} categoryName={cat.name} size={48} borderRadius={12} backgroundColor={bgColors[idx]} iconColor={colors.primary} />
              <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={2}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderBrandsGrid = () => {
    // Only show brands that have products in this category
    const activeBrandIds = new Set(browseProducts.map(p => p.brand_id).filter(Boolean));
    const filteredBrands = brands.filter(b => activeBrandIds.has(b.id));

    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}>
        {/* Breadcrumb Navigation */}
        <View style={[styles.breadcrumbRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setSelectedCategoryId(null); setSelectedBrandId(null); }} style={styles.breadcrumbLink}>
            <Feather name="home" size={14} color={colors.primary} />
            <Text style={[styles.breadcrumbText, { color: colors.primary }]}>All Categories</Text>
          </TouchableOpacity>
          <Feather name="chevron-right" size={14} color={colors.textMuted} />
          <Text style={[styles.breadcrumbCurrent, { color: colors.text }]} numberOfLines={1}>{selectedCategoryName}</Text>
        </View>

        <View style={{ gap: 4, marginVertical: 4 }}>
          <Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text }}>Select Brand</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>Choose a brand under {selectedCategoryName}</Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {/* Option for "All Brands" */}
          <TouchableOpacity 
            style={[styles.brandCard, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '44' }]}
            onPress={() => setSelectedBrandId(0)}
            activeOpacity={0.7}
          >
            <View style={[styles.brandIconBox, { backgroundColor: colors.primary + '22' }]}>
              <Feather name="grid" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.brandName, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>All Brands</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>View all items</Text>
          </TouchableOpacity>

          {filteredBrands.map(brand => (
            <TouchableOpacity 
              key={brand.id} 
              style={[styles.brandCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedBrandId(brand.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.brandIconBox, { backgroundColor: colors.inputBg }]}>
                <Feather name="tag" size={20} color={colors.textSecondary} />
              </View>
              <Text style={[styles.brandName, { color: colors.text }]} numberOfLines={1}>{brand.name}</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Explore items</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderProductsList = () => (
    <FlatList
      data={browseProducts}
      keyExtractor={p => String(p.id)}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 8 }}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 12 }}>
          {/* Breadcrumb Navigation */}
          <View style={[styles.breadcrumbRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setSelectedCategoryId(null); setSelectedBrandId(null); }} style={styles.breadcrumbLink}>
              <Text style={[styles.breadcrumbText, { color: colors.primary }]}>All</Text>
            </TouchableOpacity>
            <Feather name="chevron-right" size={12} color={colors.textMuted} />
            <TouchableOpacity onPress={() => setSelectedBrandId(null)} style={styles.breadcrumbLink}>
              <Text style={[styles.breadcrumbText, { color: colors.primary }]} numberOfLines={1}>{selectedCategoryName}</Text>
            </TouchableOpacity>
            <Feather name="chevron-right" size={12} color={colors.textMuted} />
            <Text style={[styles.breadcrumbCurrent, { color: colors.text }]} numberOfLines={1}>{selectedBrandName}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_700Bold', color: colors.text }}>
              {selectedBrandName} ({browseProducts.length})
            </Text>
            <TouchableOpacity onPress={() => setSelectedBrandId(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="arrow-left" size={14} color={colors.primary} />
              <Text style={{ fontSize: 13, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Change Brand</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyList}>
          <Feather name="box" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products in this category/brand</Text>
        </View>
      }
      renderItem={({ item: p }) => (
        <TouchableOpacity style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => addToCart(p)} activeOpacity={0.7}>
          <ProductImage imageUri={p.image_uri} categoryName={p.category_name} size={44} borderRadius={10} backgroundColor={colors.primary + '15'} iconColor={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
            <Text style={[styles.prodSku, { color: colors.textSecondary }]}>{p.sku} • {p.brand_name || ''} • Stock: {p.current_stock}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.prodPrice, { color: colors.primary }]}>{formatCurrency(p.selling_price)}</Text>
            <View style={[styles.stockBadge, { backgroundColor: p.current_stock > p.reorder_level ? colors.success + '22' : p.current_stock > 0 ? colors.warning + '22' : colors.error + '22' }]}>
              <Text style={[styles.stockText, { color: p.current_stock > p.reorder_level ? colors.success : p.current_stock > 0 ? colors.warning : colors.error }]}>{p.current_stock > 0 ? `${p.current_stock} pcs` : 'Out'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );


  const addToCart = (p: Product) => {
    if (p.current_stock <= 0) {
      Alert.alert('Out of Stock', `${p.name} is out of stock`);
      return;
    }
    cart.addItem({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      quantity: 1,
      unitPrice: p.selling_price,
      discount: 0,
      gstRate: p.gst_rate,
      currentStock: p.current_stock,
      costPrice: p.cost_price,
    });
    setSearch('');
    setProducts([]);
  };

  const handleCheckout = async () => {
    if (!repos || cart.items.length === 0) return;
    const paid = parseFloat(amountPaid);
    const finalPaid = isNaN(paid) ? computedGrandTotal : paid;
    
    if (paymentMethod === 'CASH' && finalPaid < computedGrandTotal) {
      Alert.alert('Insufficient Amount', `Amount paid must be at least ${formatCurrency(computedGrandTotal)}`);
      return;
    }
    
    try {
      const sale = await repos.sales.createSale({
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paymentMethod,
        amountPaid: finalPaid,
        discountAmount: parseFloat(discountText) || 0,
        createdById: user?.id,
        items: cart.items.map(item => ({
          ...item,
          gstRate: applyGst ? item.gstRate : 0
        })),
      });
      
      cart.clearCart();
      setShowCheckout(false);
      setShowCart(false);
      setCustomerName('');
      setCustomerPhone('');
      setAmountPaid('');
      setDiscountText('');
      setApplyGst(false);
      setSuccessSale(sale);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create sale');
    }
  };

  const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'CREDIT', 'BANK_TRANSFER', 'EMI'];

  if (showCheckout) {
    return (
      <KeyboardAvoidingView style={[styles.root, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={[styles.checkoutHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCheckout(false)}>
              <Feather name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Order Summary */}
          <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>ORDER SUMMARY</Text>
            {cart.items.map(item => (
              <View key={item.productId} style={styles.checkItem}>
                <Text style={[styles.checkItemName, { color: colors.text }]} numberOfLines={1}>{item.name} × {item.quantity}</Text>
                <Text style={[styles.checkItemPrice, { color: colors.text }]}>{formatCurrency(item.unitPrice * item.quantity - item.discount)}</Text>
              </View>
            ))}
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <View style={styles.checkItem}>
              <Text style={[styles.checkItemName, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.checkItemPrice, { color: colors.text }]}>{formatCurrency(cart.subtotal)}</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={[styles.checkItemName, { color: colors.textSecondary }]}>GST</Text>
              <Text style={[styles.checkItemPrice, { color: colors.text }]}>{formatCurrency(applyGst ? cart.totalTax : 0)}</Text>
            </View>
            {cart.overallDiscount > 0 && (
              <View style={styles.checkItem}>
                <Text style={[styles.checkItemName, { color: colors.success }]}>Discount</Text>
                <Text style={[styles.checkItemPrice, { color: colors.success }]}>-{formatCurrency(cart.overallDiscount)}</Text>
              </View>
            )}
            <View style={[styles.divider, { borderTopColor: colors.border }]} />
            <View style={styles.checkItem}>
              <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Grand Total</Text>
              <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(computedGrandTotal)}</Text>
            </View>
          </View>

          {/* GST Tax Option (Optional) */}
          <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>TAX OPTIONS (OPTIONAL)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
              <View style={{ flex: 1, gap: 2, paddingRight: 12 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Inter_600SemiBold', color: colors.text }}>Apply GST Tax</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.textSecondary }}>Default: OFF. Enable to compute CGST/SGST on this sale</Text>
              </View>
              <TouchableOpacity 
                style={[styles.payBtn, { backgroundColor: applyGst ? colors.primary : colors.inputBg, borderColor: applyGst ? colors.primary : colors.border }]} 
                onPress={() => setApplyGst(!applyGst)}
                activeOpacity={0.8}
              >
                <Text style={[styles.payText, { color: applyGst ? '#FFF' : colors.textSecondary, fontWeight: 'bold' }]}>
                  {applyGst ? "GST ENABLED" : "GST DISABLED"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer */}
          <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>CUSTOMER (OPTIONAL)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Customer Name" placeholderTextColor={colors.textMuted} value={customerName} onChangeText={setCustomerName} />
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Phone Number" placeholderTextColor={colors.textMuted} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
          </View>

          {/* Discount */}
          <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>OVERALL DISCOUNT</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="₹0" placeholderTextColor={colors.textMuted} value={discountText} onChangeText={t => { setDiscountText(t); cart.setOverallDiscount(parseFloat(t) || 0); }} keyboardType="numeric" />
          </View>

          {/* Payment Method */}
          <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
            <View style={styles.payMethods}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} style={[styles.payBtn, { backgroundColor: paymentMethod === m ? colors.primary : colors.inputBg, borderColor: paymentMethod === m ? colors.primary : colors.border }]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[styles.payText, { color: paymentMethod === m ? '#FFF' : colors.textSecondary }]}>{m.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Amount Paid */}
          {paymentMethod === 'CASH' && (
            <View style={[styles.checkSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.checkLabel, { color: colors.textSecondary }]}>AMOUNT RECEIVED</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, fontSize: 22, fontFamily: 'Inter_700Bold' }]} placeholder={formatCurrency(computedGrandTotal)} placeholderTextColor={colors.textMuted} value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" />
              {parseFloat(amountPaid) > computedGrandTotal && (
                <Text style={[styles.changeText, { color: colors.success }]}>Change: {formatCurrency(parseFloat(amountPaid) - computedGrandTotal)}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Complete Button */}
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.primary }]} onPress={handleCheckout} activeOpacity={0.8}>
            <Feather name="check-circle" size={20} color="#FFF" />
            <Text style={styles.completeBtnText}>Complete Sale — {formatCurrency(computedGrandTotal)}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.posHeader, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>POS Terminal</Text>
        <TouchableOpacity style={[styles.cartBtn, { backgroundColor: colors.primary + '22' }]} onPress={() => setShowCart(!showCart)}>
          <Feather name="shopping-cart" size={20} color={colors.primary} />
          {cart.totalItems > 0 && (
            <View style={[styles.cartBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.cartBadgeText}>{cart.totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search products, SKU, barcode..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} autoCapitalize="none" />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); setProducts([]); }}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Product Results */}
      {!showCart ? (
        search.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={p => String(p.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 8 }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Feather name="search" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{search ? 'No products found' : 'Search for products to add'}</Text>
              </View>
            }
            renderItem={({ item: p }) => (
              <TouchableOpacity style={[styles.productRow, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => addToCart(p)} activeOpacity={0.7}>
                <ProductImage imageUri={p.image_uri} categoryName={p.category_name} size={44} borderRadius={10} backgroundColor={colors.primary + '15'} iconColor={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.prodSku, { color: colors.textSecondary }]}>{p.sku} • {p.brand_name || ''} • Stock: {p.current_stock}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.prodPrice, { color: colors.primary }]}>{formatCurrency(p.selling_price)}</Text>
                  <View style={[styles.stockBadge, { backgroundColor: p.current_stock > p.reorder_level ? colors.success + '22' : p.current_stock > 0 ? colors.warning + '22' : colors.error + '22' }]}>
                    <Text style={[styles.stockText, { color: p.current_stock > p.reorder_level ? colors.success : p.current_stock > 0 ? colors.warning : colors.error }]}>{p.current_stock > 0 ? `${p.current_stock} pcs` : 'Out'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          selectedCategoryId === null ? (
            renderCategoriesGrid()
          ) : selectedBrandId === null ? (
            renderBrandsGrid()
          ) : (
            renderProductsList()
          )
        )
      ) : (
        /* Cart View */
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
          {cart.items.length === 0 ? (
            <View style={styles.emptyList}>
              <Feather name="shopping-cart" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Cart is empty</Text>
            </View>
          ) : (
            <>
              {cart.items.map(item => (
                <View key={item.productId} style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.prodSku, { color: colors.textSecondary }]}>{formatCurrency(item.unitPrice)} × {item.quantity}</Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={[styles.qtyBtn, { borderColor: colors.border }]} onPress={() => cart.updateQuantity(item.productId, item.quantity - 1)}>
                      <Feather name="minus" size={14} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { borderColor: colors.border }]} onPress={() => cart.updateQuantity(item.productId, item.quantity + 1)}>
                      <Feather name="plus" size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.cartItemTotal, { color: colors.text }]}>{formatCurrency(item.unitPrice * item.quantity)}</Text>
                  <TouchableOpacity onPress={() => cart.removeItem(item.productId)} style={{ padding: 4 }}>
                    <Feather name="trash-2" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={[styles.cartSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text><Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(cart.subtotal)}</Text></View>
                <View style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>GST</Text><Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(cart.totalTax)}</Text></View>
                <View style={[styles.divider, { borderTopColor: colors.border }]} />
                <View style={styles.summaryRow}><Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text><Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(cart.grandTotal)}</Text></View>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Bottom Bar */}
      {cart.items.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
          {!showCart ? (
            <TouchableOpacity style={[styles.viewCartBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCart(true)} activeOpacity={0.8}>
              <Feather name="shopping-cart" size={18} color="#FFF" />
              <Text style={styles.viewCartText}>View Cart ({cart.totalItems})</Text>
              <Text style={styles.viewCartTotal}>{formatCurrency(cart.grandTotal)}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.completeBtn, { backgroundColor: colors.primary }]} onPress={() => setShowCheckout(true)} activeOpacity={0.8}>
              <Feather name="arrow-right" size={20} color="#FFF" />
              <Text style={styles.completeBtnText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Checkout Success Modal */}
      <Modal
        visible={successSale !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessSale(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.successIconBox, { backgroundColor: colors.success + '15' }]}>
              <Feather name="check-circle" size={48} color={colors.success} />
            </View>
            
            <Text style={[styles.successTitle, { color: colors.text }]}>Sale Complete! ✅</Text>
            
            <View style={[styles.successDetails, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Invoice No:</Text>
                <Text style={[styles.detailValue, { color: colors.text, fontFamily: 'Inter_700Bold' }]}>{successSale?.invoice_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total Collected:</Text>
                <Text style={[styles.detailValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(successSale?.grand_total || 0)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Payment Method:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{successSale?.payment_method}</Text>
              </View>
              
              {successSale?.payment_method === 'CASH' && successSale?.change_amount > 0 && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Cash Received:</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(successSale?.amount_paid || 0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.success }]}>Change Returned:</Text>
                    <Text style={[styles.detailValue, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{formatCurrency(successSale?.change_amount || 0)}</Text>
                  </View>
                </>
              )}
            </View>
            
            <View style={styles.successActions}>
              <TouchableOpacity
                style={[styles.successPrintBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const saleId = successSale?.id;
                  setSuccessSale(null);
                  router.push(`/sale/${saleId}` as any);
                }}
                activeOpacity={0.8}
              >
                <Feather name="printer" size={18} color="#FFF" />
                <Text style={styles.successPrintText}>Print & View Invoice</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.successNewBtn, { borderColor: colors.border }]}
                onPress={() => setSuccessSale(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.successNewText, { color: colors.textSecondary }]}>Start New Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  posHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  cartBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#FFF' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  emptyList: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  prodName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  prodSku: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  prodPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  stockText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  cartItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontFamily: 'Inter_700Bold', minWidth: 70, textAlign: 'right' },
  cartSummary: { padding: 16, borderRadius: 14, borderWidth: 1, marginTop: 8, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  grandTotalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  grandTotalValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  bottomBar: { borderTopWidth: 1, padding: 16 },
  viewCartBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8, paddingHorizontal: 20 },
  viewCartText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: '#FFF', flex: 1 },
  viewCartTotal: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#FFF' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8 },
  completeBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
  checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  checkSection: { margin: 16, marginBottom: 0, padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  checkLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  checkItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkItemName: { fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 },
  checkItemPrice: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  payMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  payText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  changeText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', marginTop: 4 },
  categoryCard: { width: '48%', padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 12, minHeight: 120, justifyContent: 'center' },
  categoryName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 8, flexWrap: 'wrap' },
  breadcrumbLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  breadcrumbCurrent: { fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1 },
  brandCard: { width: '48%', padding: 16, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 8, minHeight: 110, justifyContent: 'center' },
  brandIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  successDetails: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  successActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  successPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  successPrintText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFF',
  },
  successNewBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  successNewText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
});
