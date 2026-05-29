/**
 * Billing (POS) Screen — Fast checkout, barcode scanning, cart management
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/utils/formatters';
import type { Product, Category, Brand } from '@/database/repositories';
import { CATEGORY_IMAGES } from '@/database/seedData';
import { Image } from 'react-native';

const { height } = Dimensions.get('window');

export default function POSScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const { user } = useAuth();
  const cart = useCart();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!repos) return;
    const cats = await repos.categories.list();
    setCategories(cats);
    const results = await repos.products.list({ isActive: true });
    setProducts(results.slice(0, 15));
  }, [repos]);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

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

  const [permission, requestPermission] = useCameraPermissions();
  
  // Checkout State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [discountText, setDiscountText] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [applyGst, setApplyGst] = useState(true);

  const discountAmount = parseFloat(discountText) || 0;
  const grandTotal = cart.subtotal + (applyGst ? cart.totalTax : 0) - discountAmount;

  useEffect(() => {
    setAmountPaid(grandTotal > 0 ? grandTotal.toString() : '0');
  }, [grandTotal]);

  const searchProducts = useCallback(async (term: string) => {
    if (!repos || term.length < 2) { setProducts([]); return; }
    const results = await repos.products.list({ search: term, isActive: true });
    setProducts(results.slice(0, 15));
  }, [repos]);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    if (!repos) return;
    const results = await repos.products.list({ search: data, isActive: true });
    const product = results.find(p => p.barcode === data || p.sku === data);
    
    if (product) {
      if (product.current_stock <= 0) {
        Alert.alert('Out of Stock', `${product.name} is currently out of stock.`);
        return;
      }
      cart.addItem({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: 1,
        unitPrice: product.selling_price,
        discount: 0,
        gstRate: product.gst_rate,
        currentStock: product.current_stock,
        costPrice: product.cost_price,
      });
      Alert.alert('Added', `${product.name} added to cart.`);
    } else {
      Alert.alert('Not Found', `No product found for barcode: ${data}`);
    }
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
        return;
      }
    }
    setShowScanner(true);
  };

  const lookupCustomer = async () => {
    if (!repos || customerPhone.length < 10) return;
    const customers = await repos.customers.list(customerPhone);
    if (customers.length > 0) {
      setCustomerName(customers[0].name);
    }
  };

  const submitSale = async () => {
    if (!repos || cart.items.length === 0) return;
    try {
      const sale = await repos.sales.createSale({
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        paymentMethod,
        discountAmount,
        amountPaid: parseFloat(amountPaid) || grandTotal,
        items: cart.items.map(i => ({
          ...i,
          gstRate: applyGst ? i.gstRate : 0,
        })),
        createdById: user?.id,
      });

      cart.clearCart();
      setShowCheckout(false);
      setCustomerPhone('');
      setCustomerName('');
      setDiscountText('');
      
      Alert.alert('Success ✅', `Invoice #${sale.invoice_number} generated successfully!`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Billing</Text>
        <TouchableOpacity style={[styles.scanBtn, { backgroundColor: colors.primary }]} onPress={handleOpenScanner}>
          <Feather name="maximize" size={18} color="#FFF" />
          <Text style={styles.scanBtnText}>Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        
        
        {/* Left Side: Search & Visual Grid */}
        <View style={[styles.searchSection, { borderRightColor: colors.border }]}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }}>
            {(selectedCat || selectedBrand) && (
              <TouchableOpacity onPress={() => { if (selectedBrand) setSelectedBrand(null); else setSelectedCat(null); }} style={{ marginRight: 12 }}>
                <Feather name="arrow-left" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <View style={[styles.searchBox, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search products..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  if (text.length > 1) {
                    setSelectedCat(null);
                    setSelectedBrand(null);
                  }
                }}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {(!selectedCat && search.length < 2) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => loadBrandsForCategory(cat)}
                  >
                    <Image source={{ uri: cat.image_uri || CATEGORY_IMAGES[cat.name] || CATEGORY_IMAGES['Accessories'] }} style={styles.catImage} resizeMode="cover" />
                    <Text style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (selectedCat && !selectedBrand && search.length < 2) ? (
              <View>
                <Text style={{ fontSize: 16, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 12 }}>Select Brand</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <TouchableOpacity style={[styles.brandChip, { borderColor: colors.primary }]} onPress={() => loadProductsForBrand(null)}>
                    <Text style={[styles.brandName, { color: colors.primary }]}>All {selectedCat.name}</Text>
                  </TouchableOpacity>
                  {brands.map(b => (
                    <TouchableOpacity key={b.id} style={[styles.brandChip, { borderColor: colors.border }]} onPress={() => loadProductsForBrand(b)}>
                      <Text style={[styles.brandName, { color: colors.text }]}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {products.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.prodCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      if (p.current_stock > 0) cart.addItem({
                        productId: p.id, name: p.name, sku: p.sku, quantity: 1, unitPrice: p.selling_price, discount: 0, gstRate: p.gst_rate, currentStock: p.current_stock, costPrice: p.cost_price,
                      });
                      else Alert.alert('Out of Stock', 'Cannot add this item to cart.');
                    }}
                  >
                    <View style={styles.prodImageContainer}>
                      <Image source={{ uri: p.image_uri || CATEGORY_IMAGES[selectedCat?.name || ''] || CATEGORY_IMAGES['Accessories'] }} style={styles.prodImage} resizeMode="cover" />
                    </View>
                    <View style={styles.prodInfo}>
                      <Text style={[styles.prodGridName, { color: colors.text }]} numberOfLines={2}>{p.name}</Text>
                      <Text style={[styles.prodGridPrice, { color: colors.primary }]}>{formatCurrency(p.selling_price)}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>Stock: {p.current_stock}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
{/* Right Side: Cart */}
        <View style={styles.cartSection}>
          <View style={[styles.cartHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cartTitle, { color: colors.text }]}>Current Cart ({cart.items.length})</Text>
            {cart.items.length > 0 && (
              <TouchableOpacity onPress={cart.clearCart}>
                <Feather name="trash-2" size={18} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ flex: 1 }}>
            {cart.items.length === 0 ? (
              <View style={styles.emptyCart}>
                <Feather name="shopping-cart" size={48} color={colors.border} />
                <Text style={[styles.emptyCartText, { color: colors.textMuted }]}>Cart is empty</Text>
              </View>
            ) : (
              cart.items.map(item => (
                <View key={item.productId} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1, marginBottom: 8 }}>
                    <Text style={[styles.cartItemName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.cartItemPrice, { color: colors.primary }]}>{formatCurrency(item.unitPrice)}</Text>
                  </View>
                  <View style={styles.cartItemActions}>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.inputBg }]} onPress={() => cart.updateQuantity(item.productId, item.quantity - 1)}>
                      <Feather name="minus" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                    <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.inputBg }]} onPress={() => cart.updateQuantity(item.productId, item.quantity + 1)}>
                      <Feather name="plus" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Cart Footer */}
          <View style={[styles.cartFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.textSecondary }}>Subtotal</Text>
              <Text style={{ color: colors.text }}>{formatCurrency(cart.subtotal)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutBtn, { backgroundColor: cart.items.length > 0 ? colors.primary : colors.border }]}
              disabled={cart.items.length === 0}
              onPress={() => setShowCheckout(true)}
            >
              <Text style={styles.checkoutBtnText}>Checkout</Text>
              <Text style={styles.checkoutBtnText}>{formatCurrency(cart.subtotal + cart.totalTax)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Barcode Scanner Modal */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: '#000', borderBottomWidth: 0 }]}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.iconBtn}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={[styles.title, { color: '#FFF' }]}>Scan Barcode</Text>
            <View style={{ width: 24 }} />
          </View>
          <CameraView 
            style={{ flex: 1 }} 
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e"] }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerBox} />
            <Text style={{ color: '#FFF', marginTop: 20, fontFamily: 'Inter_500Medium' }}>Point at a product barcode</Text>
          </View>
        </View>
      </Modal>

      {/* Checkout Bottom Sheet */}
      <Modal visible={showCheckout} transparent animationType="slide" onRequestClose={() => setShowCheckout(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCheckout(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Checkout</Text>
              <TouchableOpacity onPress={() => setShowCheckout(false)}><Feather name="x" size={24} color={colors.text} /></TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Customer */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>Customer Mobile (Optional)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="10-digit number" placeholderTextColor={colors.textMuted} value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" onBlur={lookupCustomer} />
              
              <Text style={[styles.label, { color: colors.textSecondary }]}>Customer Name</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Name" placeholderTextColor={colors.textMuted} value={customerName} onChangeText={setCustomerName} />

              {/* Payment Method */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {['CASH', 'CARD', 'UPI'].map(m => (
                  <TouchableOpacity key={m} style={[styles.payBtn, { backgroundColor: paymentMethod === m ? colors.primary + '22' : colors.inputBg, borderColor: paymentMethod === m ? colors.primary : colors.border }]} onPress={() => setPaymentMethod(m)}>
                    <Text style={[styles.payBtnText, { color: paymentMethod === m ? colors.primary : colors.text }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Discount */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Discount Amount (₹)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput style={[styles.input, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="0" placeholderTextColor={colors.textMuted} value={discountText} onChangeText={setDiscountText} keyboardType="numeric" />
                <TouchableOpacity style={[styles.quickDiscBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => setDiscountText((cart.subtotal * 0.05).toFixed(0))}><Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>5%</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.quickDiscBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => setDiscountText((cart.subtotal * 0.10).toFixed(0))}><Text style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}>10%</Text></TouchableOpacity>
              </View>

              {/* GST Toggle */}
              <TouchableOpacity style={[styles.gstToggle, { backgroundColor: colors.inputBg, borderColor: colors.border }]} onPress={() => setApplyGst(!applyGst)}>
                <Feather name={applyGst ? 'check-square' : 'square'} size={20} color={applyGst ? colors.primary : colors.textMuted} />
                <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.text, marginLeft: 8 }}>Apply GST</Text>
              </TouchableOpacity>

              {/* Amount Paid */}
              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>Amount Paid (₹)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, fontSize: 24, height: 60, fontFamily: 'Inter_700Bold' }]} value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" />

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryRow}><Text style={{ color: colors.textSecondary }}>Subtotal:</Text><Text style={{ color: colors.text }}>{formatCurrency(cart.subtotal)}</Text></View>
                {applyGst && <View style={styles.summaryRow}><Text style={{ color: colors.textSecondary }}>Tax (GST):</Text><Text style={{ color: colors.text }}>{formatCurrency(cart.totalTax)}</Text></View>}
                {discountAmount > 0 && <View style={styles.summaryRow}><Text style={{ color: colors.error }}>Discount:</Text><Text style={{ color: colors.error }}>-{formatCurrency(discountAmount)}</Text></View>}
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 8 }]}><Text style={{ fontSize: 18, fontFamily: 'Inter_700Bold', color: colors.text }}>Grand Total:</Text><Text style={{ fontSize: 22, fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatCurrency(grandTotal)}</Text></View>
                <View style={styles.summaryRow}><Text style={{ color: colors.textSecondary }}>Change Due:</Text><Text style={{ color: colors.success }}>{formatCurrency(Math.max(0, (parseFloat(amountPaid) || 0) - grandTotal))}</Text></View>
              </View>
            </ScrollView>

            <View style={{ padding: 16 }}>
              <TouchableOpacity style={[styles.finalCheckoutBtn, { backgroundColor: colors.primary }]} onPress={submitSale}>
                <Text style={styles.finalCheckoutText}>Complete Sale</Text>
                <Feather name="check" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  scanBtnText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  iconBtn: { padding: 4 },
  
  searchSection: { flex: 3, borderRightWidth: 1 },
  
  catCard: { width: '47%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingBottom: 8 },
  catImage: { width: '100%', height: 100, marginBottom: 8 },
  catName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 4 },
  brandChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1 },
  brandName: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  prodCard: { width: '47%', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  prodImageContainer: { width: '100%', height: 100, backgroundColor: '#f0f0f0' },
  prodImage: { width: '100%', height: '100%' },
  prodInfo: { padding: 8 },
  prodGridName: { fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 4, height: 32 },
  prodGridPrice: { fontSize: 14, fontFamily: 'Inter_700Bold', marginBottom: 4 },

  cartSection: { flex: 2 },

  searchBox: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },

  productRow: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prodName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  prodSku: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  prodPrice: { fontSize: 15, fontFamily: 'Inter_700Bold' },

  cartHeader: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyCart: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyCartText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  cartItem: { padding: 16, borderBottomWidth: 1 },
  cartItemName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cartItemPrice: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', minWidth: 20, textAlign: 'center' },

  cartFooter: { padding: 16, borderTopWidth: 1 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checkoutBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 50, borderRadius: 12, paddingHorizontal: 16, marginTop: 8 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Inter_700Bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 15, marginBottom: 16 },
  
  paymentMethods: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  payBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  quickDiscBtn: { height: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gstToggle: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },

  summaryCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  
  finalCheckoutBtn: { flexDirection: 'row', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 8 },
  finalCheckoutText: { color: '#FFF', fontSize: 18, fontFamily: 'Inter_700Bold' },

  scannerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scannerBox: { width: 250, height: 250, borderWidth: 2, borderColor: '#FFF', backgroundColor: 'transparent' },
});
