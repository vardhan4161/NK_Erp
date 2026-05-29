import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, KeyboardAvoidingView, ActivityIndicator, Image, Modal, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CATEGORY_IMAGES } from '@/database/seedData';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { ProductImage } from '@/components/ProductImage';
import type { Category, Brand } from '@/database/repositories';

const getCatIcon = (name: string) => {
    if (!name) return 'box';
    const n = name.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return 'smartphone';
    if (n.includes('laptop') || n.includes('computer')) return 'monitor';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('tv') || n.includes('television')) return 'tv';
    if (n.includes('watch')) return 'watch';
    if (n.includes('ac') || n.includes('conditioner') || n.includes('air')) return 'wind';
    if (n.includes('camera')) return 'camera';
    return 'box';
  };

export default function AddProductScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [brandId, setBrandId] = useState<number>(0);
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [gstRate, setGstRate] = useState('');
  const [stock, setStock] = useState('0');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [warranty, setWarranty] = useState('0');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    setShowScanner(false);
    setBarcode(data);
    
    // Auto-fetch details
    try {
      setIsScraping(true);
      const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${data}`);
      const json = await res.json();
      if (json.items && json.items.length > 0) {
        const item = json.items[0];
        if (item.title && !name) setName(item.title);
        if (item.model && !model) setModel(item.model);
        if (item.description && !description) setDescription(item.description);
        if (item.images && item.images.length > 0 && !imageUri) setImageUri(item.images[0]);
        if (item.brand && !brandId) {
          setNewBrandName(item.brand);
          setShowNewBrandInput(true);
        }
        Alert.alert('Product Found! 📦', `Fetched details for: ${item.title}`);
      } else {
        Alert.alert('Scanned', 'Barcode scanned! We could not find auto-details online, but the barcode is filled.');
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Scanned', 'Barcode scanned successfully.');
    } finally {
      setIsScraping(false);
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


  const [recommendedBrandIds, setRecommendedBrandIds] = useState<Set<number>>(new Set());
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showNewBrandInput, setShowNewBrandInput] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  useEffect(() => {
    if (!repos) return;
    repos.categories.list().then(setCategories);
    repos.brands.list().then(setBrands);
  }, [repos]);

  useEffect(() => {
    setShowAllBrands(false);
    if (!repos || !categoryId) {
      setRecommendedBrandIds(new Set());
      return;
    }
    repos.products.list({ categoryId, isActive: true }).then(prods => {
      setRecommendedBrandIds(new Set(prods.map(p => p.brand_id).filter(Boolean) as number[]));
    });
  }, [categoryId, repos]);

  const handleAutoScrape = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Preview 🌐', 'Web image scraping is bypassed in the browser to avoid CORS block hangs. It works fully on native Android/iOS!');
      return;
    }
    const selectedCategory = categories.find(c => c.id === categoryId)?.name || '';
    const selectedBrand = brands.find(b => b.id === brandId)?.name || '';
    const terms = [selectedBrand, model, selectedCategory].filter(Boolean).join(' ').trim();
    
    if (!terms) {
      Alert.alert('Details Missing', 'Please select a category or enter brand/model details first to scrape an image.');
      return;
    }

    setIsScraping(true);
    try {
      const query = `${selectedBrand} ${model} ${selectedCategory}`.trim();
      const formattedQuery = encodeURIComponent(query);
      const url = `https://unsplash.com/s/photos/${formattedQuery}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      const html = await response.text();
      const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-?=&;._%]+/g;
      const matches = html.match(regex);
      
      let foundUrl = null;
      if (matches && matches.length > 0) {
        for (const imgUrl of matches) {
          if (imgUrl.includes('profile') || imgUrl.includes('placeholder') || imgUrl.includes('avatar')) continue;
          const baseUrl = imgUrl.split('?')[0];
          foundUrl = `${baseUrl}?w=400&h=400&fit=crop&q=80`;
          break;
        }
      }

      if (foundUrl) {
        setImageUri(foundUrl);
        Alert.alert('Image Found! 📸', `Successfully fetched a web image for "${terms}"!`);
      } else {
        Alert.alert('Not Found', 'Could not find a specific image on the web. Using standard category placeholder instead.');
      }
    } catch (error) {
      Alert.alert('Scraping Error', 'Unable to fetch image. Please check your internet connection.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSave = async () => {
    if (!repos) return;
    if (!name.trim()) { Alert.alert('Error', 'Product name is required'); return; }
    if (!categoryId) { Alert.alert('Error', 'Please select a category'); return; }
    if (!sellingPrice.trim()) { Alert.alert('Error', 'Selling price is required'); return; }

    setIsScraping(true);
    let finalImageUri = imageUri.trim();
    if (!finalImageUri && Platform.OS !== 'web') {
      const selectedCategory = categories.find(c => c.id === categoryId)?.name || '';
      const selectedBrand = brands.find(b => b.id === brandId)?.name || '';
      const terms = [selectedBrand, model].filter(Boolean).join(' ').trim();
      if (terms) {
        try {
          const query = `${selectedBrand} ${model} ${selectedCategory}`.trim();
          const url = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
          });
          const html = await response.text();
          const regex = /https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-?=&;._%]+/g;
          const matches = html.match(regex);
          if (matches && matches.length > 0) {
            for (const imgUrl of matches) {
              if (imgUrl.includes('profile') || imgUrl.includes('placeholder') || imgUrl.includes('avatar')) continue;
              finalImageUri = imgUrl.split('?')[0] + '?w=400&h=400&fit=crop&q=80';
              break;
            }
          }
        } catch (err) {
          console.log('Background scrape failed:', err);
        }
      }
    }

    let finalBrandId = brandId;
    if (showNewBrandInput && newBrandName.trim()) {
      finalBrandId = await repos.brands.create(newBrandName.trim());
    }

    try {
      const id = await repos.products.create({
        name: name.trim(),
        category_id: categoryId,
        brand_id: finalBrandId || undefined,
        model: model.trim() || undefined,
        variant: variant.trim() || undefined,
        barcode: barcode.trim() || undefined,
        cost_price: costPrice.trim() ? parseFloat(costPrice) : parseFloat(sellingPrice) * 0.7,
        selling_price: parseFloat(sellingPrice),
        gst_rate: gstRate.trim() ? parseFloat(gstRate) : 0,
        current_stock: parseInt(stock) || 0,
        reorder_level: parseInt(reorderLevel) || 5,
        warranty_months: parseInt(warranty) || 0,
        description: description.trim() || undefined,
        image_uri: finalImageUri || undefined,
      });
      setIsScraping(false);
      Alert.alert('Success ✅', 'Product added successfully', [
        { text: 'View', onPress: () => router.replace(`/product/${id}` as any) },
        { text: 'Add Another', onPress: () => { 
          setName(''); 
          setBarcode(''); 
          setCostPrice(''); 
          setSellingPrice(''); 
          setGstRate(''); 
          setStock('0'); 
          setDescription(''); 
          setImageUri('');
          setModel('');
          setVariant('');
          setCategoryId(0);
          setBrandId(0);
          setShowNewBrandInput(false);
          setNewBrandName('');
        } },
      ]);
    } catch (e: any) {
      setIsScraping(false);
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 40, borderBottomWidth: 1, backgroundColor: colors.card, borderBottomColor: colors.border }}>
        <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => {
          if (step > 1) setStep(step - 1);
          else router.back();
        }}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: 'Inter_700Bold', color: colors.text }}>Add Product</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
          {step === 1 && (
            <View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 16 }}>Step 1: Select Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={{ width: '30%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingBottom: 8, backgroundColor: colors.card, borderColor: categoryId === cat.id ? colors.primary : colors.border }}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setStep(2);
                    }}
                  >
                    <View style={{ width: '100%', height: 80, marginBottom: 8, backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                      <Feather name={getCatIcon(cat.name) as any} size={32} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 4, color: colors.text }} numberOfLines={1}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.text, marginBottom: 16 }}>Step 2: Select Brand</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <TouchableOpacity 
                  style={{ width: '30%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingBottom: 8, backgroundColor: colors.card, borderColor: brandId === 0 && !showNewBrandInput ? colors.primary : colors.border }}
                  onPress={() => {
                    setBrandId(0);
                    setShowNewBrandInput(false);
                    setStep(3);
                  }}
                >
                  <View style={{ width: '100%', height: 80, marginBottom: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.textMuted }}>N</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 4, color: colors.text }} numberOfLines={1}>None</Text>
                </TouchableOpacity>

                {brands.map(b => {
                  const isRecommended = recommendedBrandIds.has(b.id) || recommendedBrandIds.size === 0;
                  if (categoryId > 0 && !isRecommended && !showAllBrands && brandId !== b.id) return null;

                  return (
                    <TouchableOpacity 
                      key={b.id} 
                      style={{ width: '30%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingBottom: 8, backgroundColor: colors.card, borderColor: brandId === b.id ? colors.primary : colors.border }}
                      onPress={() => {
                        setBrandId(b.id);
                        setShowNewBrandInput(false);
                        setStep(3);
                      }}
                    >
                      <View style={{ width: '100%', height: 80, marginBottom: 8, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24, fontFamily: 'Inter_700Bold', color: colors.textMuted }}>{b.name.charAt(0)}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 4, color: colors.text }} numberOfLines={1}>{b.name}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity 
                  style={{ width: '30%', borderRadius: 12, borderWidth: 1, overflow: 'hidden', paddingBottom: 8, backgroundColor: colors.card, borderColor: colors.primary, borderStyle: 'dashed' }}
                  onPress={() => {
                    setShowNewBrandInput(true);
                    setBrandId(0);
                    setStep(3);
                  }}
                >
                  <View style={{ width: '100%', height: 80, marginBottom: 8, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="plus" size={24} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', textAlign: 'center', paddingHorizontal: 4, color: colors.primary }} numberOfLines={1}>Add New</Text>
                </TouchableOpacity>
              </View>
              {categoryId > 0 && !showAllBrands && recommendedBrandIds.size > 0 && (
                <TouchableOpacity style={{ marginTop: 16, padding: 12, backgroundColor: colors.inputBg, borderRadius: 8, alignItems: 'center' }} onPress={() => setShowAllBrands(true)}>
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Show All Brands</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: 'Inter_600SemiBold', color: colors.text }}>Step 3: Product Details</Text>
              
              {showNewBrandInput && (
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Input label="New Brand Name *" value={newBrandName} onChangeText={setNewBrandName} colors={colors} placeholder="e.g., Sony" />
                </View>
              )}

              {/* Basic Info */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>BASIC INFO</Text>
                <Input label="Product Name *" value={name} onChangeText={setName} colors={colors} placeholder="e.g., Symphony Cooler, iPhone 15" />
              </View>

              {/* Pricing */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>PRICING</Text>
                <Input label="Selling Price (₹) *" value={sellingPrice} onChangeText={setSellingPrice} colors={colors} keyboard="numeric" placeholder="e.g., 14500" />
              </View>

              {/* Image Options */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>PRODUCT IMAGE</Text>
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <ProductImage imageUri={imageUri} size={100} borderRadius={16} />
                </View>
                <Input label="Image URL (Optional)" value={imageUri} onChangeText={setImageUri} colors={colors} placeholder="Paste image URL or use auto-fetch" />
                <TouchableOpacity style={[styles.scrapeBtn, { borderColor: colors.primary }]} onPress={handleAutoScrape} disabled={isScraping}>
                  {isScraping ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="globe" size={16} color={colors.primary} />}
                  <Text style={[styles.scrapeBtnText, { color: colors.primary }]}>{isScraping ? 'Searching Web...' : 'Auto-Fetch Image from Web'}</Text>
                </TouchableOpacity>
              </View>

              {/* Extra Classification */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>EXTRA CLASSIFICATION</Text>
                <Input label="Model" value={model} onChangeText={setModel} colors={colors} placeholder="e.g., Galaxy S24 Ultra" />
                <Input label="Variant" value={variant} onChangeText={setVariant} colors={colors} placeholder="e.g., 256GB Black" />
              </View>

              {/* Description */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>ADDITIONAL DESCRIPTION</Text>
                <Input label="Description" value={description} onChangeText={setDescription} colors={colors} multiline placeholder="Enter notes or specs" />
              </View>

              {/* Extra Pricing */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>TAX & COST DETAILS</Text>
                <Input label="Cost Price (₹) (Optional)" value={costPrice} onChangeText={setCostPrice} colors={colors} keyboard="numeric" placeholder="e.g., 12033.90 (default: 70% of Selling)" />
                <Input label="GST Rate (%) (Optional)" value={gstRate} onChangeText={setGstRate} colors={colors} keyboard="numeric" placeholder="e.g., 18 (default: 0)" />
              </View>

              {/* Identification */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.secTitle, { color: colors.textSecondary }]}>IDENTIFICATION</Text>
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '22', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }} onPress={handleOpenScanner}>
                    <Feather name="maximize" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontFamily: 'Inter_600SemiBold', color: colors.primary }}>Scan & Auto-Fill</Text>
                  </TouchableOpacity>
                </View>
                <Input label="Barcode" value={barcode} onChangeText={setBarcode} colors={colors} placeholder="Scan or type barcode" />
                <Text style={[styles.hint, { color: colors.textMuted }]}>SKU will be auto-generated</Text>
              </View>

              {/* Stock */}
              <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.secTitle, { color: colors.textSecondary }]}>STOCK & WARRANTY</Text>
                <Input label="Initial Stock" value={stock} onChangeText={setStock} colors={colors} keyboard="numeric" />
                <Input label="Reorder Level" value={reorderLevel} onChangeText={setReorderLevel} colors={colors} keyboard="numeric" />
                <Input label="Warranty (months)" value={warranty} onChangeText={setWarranty} colors={colors} keyboard="numeric" />
              </View>

              {/* Save */}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.8}>
                <Feather name="check" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Save Product</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Scanner Modal */}
      <Modal visible={showScanner} transparent animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20, zIndex: 10 }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontFamily: 'Inter_700Bold' }}>Scan Product Barcode</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <Feather name="x" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          <CameraView 
            style={{ flex: 1 }} 
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code39', 'code128'] }}
            onBarcodeScanned={showScanner ? handleBarcodeScanned : undefined}
          />
          <View style={{ position: 'absolute', bottom: 50, left: 0, right: 0, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 14 }}>Point camera at a barcode to scan and auto-fill</Text>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function Input({ label, value, onChangeText, colors, placeholder, keyboard, multiline }: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }, multiline && { height: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboard || 'default'}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  secTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  hint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 14, gap: 8 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#FFF' },
  scrapeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, borderWidth: 1.5, gap: 8, width: '100%', marginTop: 12 },
  scrapeBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 12, borderWidth: 1.5, gap: 10, width: '100%', marginVertical: 4 },
  advancedToggleText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
});
