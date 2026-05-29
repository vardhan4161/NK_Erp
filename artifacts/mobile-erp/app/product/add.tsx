import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { ProductImage } from '@/components/ProductImage';
import type { Category, Brand } from '@/database/repositories';

export default function AddProductScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
        {/* Basic Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.textSecondary }]}>BASIC INFO</Text>
          <Input label="Product Name *" value={name} onChangeText={setName} colors={colors} placeholder="e.g., Symphony Cooler, iPhone 15" />
        </View>

        {/* Classification */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.textSecondary }]}>CLASSIFICATION</Text>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={styles.chipRow}>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={[styles.chip, { backgroundColor: categoryId === c.id ? colors.primary : colors.inputBg, borderColor: categoryId === c.id ? colors.primary : colors.border }]} onPress={() => setCategoryId(c.id)}>
                  <Text style={[styles.chipText, { color: categoryId === c.id ? '#FFF' : colors.textSecondary }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Brand</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, { backgroundColor: !brandId && !showNewBrandInput ? colors.primary : colors.inputBg, borderColor: !brandId && !showNewBrandInput ? colors.primary : colors.border }]} onPress={() => { setBrandId(0); setShowNewBrandInput(false); }}>
                <Text style={[styles.chipText, { color: !brandId && !showNewBrandInput ? '#FFF' : colors.textSecondary }]}>None</Text>
              </TouchableOpacity>
              {brands.map(b => {
                const isRecommended = recommendedBrandIds.has(b.id) || recommendedBrandIds.size === 0;
                // Only filter if category is selected, showing recommended, selected, or when showAllBrands is active
                if (categoryId > 0 && !isRecommended && !showAllBrands && brandId !== b.id) return null;

                return (
                  <TouchableOpacity key={b.id} style={[styles.chip, { backgroundColor: brandId === b.id && !showNewBrandInput ? colors.primary : colors.inputBg, borderColor: brandId === b.id && !showNewBrandInput ? colors.primary : colors.border }]} onPress={() => { setBrandId(b.id); setShowNewBrandInput(false); }}>
                    <Text style={[styles.chipText, { color: brandId === b.id && !showNewBrandInput ? '#FFF' : colors.textSecondary }]}>
                      {b.name} {categoryId > 0 && !isRecommended && '⚙️'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[styles.chip, { backgroundColor: showNewBrandInput ? colors.primary : colors.inputBg, borderColor: showNewBrandInput ? colors.primary : colors.border, borderStyle: 'dashed' }]} onPress={() => { setShowNewBrandInput(true); setBrandId(0); }}>
                <Text style={[styles.chipText, { color: showNewBrandInput ? '#FFF' : colors.primary }]}>+ New Brand</Text>
              </TouchableOpacity>
              {categoryId > 0 && !showAllBrands && recommendedBrandIds.size > 0 && (
                <TouchableOpacity style={[styles.chip, { backgroundColor: colors.inputBg, borderColor: colors.border, borderStyle: 'dashed' }]} onPress={() => setShowAllBrands(true)}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>Show All Brands</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
          {showNewBrandInput && (
            <Input label="New Brand Name *" value={newBrandName} onChangeText={setNewBrandName} colors={colors} placeholder="e.g., Sony" />
          )}
        </View>

        {/* Pricing */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.secTitle, { color: colors.textSecondary }]}>PRICING</Text>
          <Input label="Selling Price (₹) *" value={sellingPrice} onChangeText={setSellingPrice} colors={colors} keyboard="numeric" placeholder="e.g., 14200" />
        </View>

        {/* Advanced Settings Toggle */}
        <TouchableOpacity 
          style={[styles.advancedToggle, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
          onPress={() => setShowAdvanced(!showAdvanced)}
          activeOpacity={0.8}
        >
          <Feather name={showAdvanced ? "chevron-up" : "chevron-down"} size={18} color={colors.primary} />
          <Text style={[styles.advancedToggleText, { color: colors.text }]}>
            {showAdvanced ? "Hide Advanced Settings" : "Show Advanced Settings (Cost, Stock, GST...)"}
          </Text>
        </TouchableOpacity>

        {/* Advanced Settings Block */}
        {showAdvanced && (
          <View style={{ gap: 16 }}>
            {/* Product Image */}
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
              <Text style={[styles.secTitle, { color: colors.textSecondary, alignSelf: 'flex-start' }]}>PRODUCT IMAGE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', marginTop: 8 }}>
                <ProductImage
                  imageUri={imageUri}
                  categoryName={categories.find(c => c.id === categoryId)?.name}
                  size={72}
                  borderRadius={14}
                />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 13, color: colors.text, fontFamily: 'Inter_600SemiBold' }}>
                    {imageUri ? 'Custom web image loaded' : 'Default placeholder loaded'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}>
                    Image will be automatically scraped or you can search manually.
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.scrapeBtn, { borderColor: colors.primary }]} 
                onPress={handleAutoScrape} 
                disabled={isScraping}
                activeOpacity={0.8}
              >
                {isScraping ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather name="globe" size={16} color={colors.primary} />
                )}
                <Text style={[styles.scrapeBtnText, { color: colors.primary }]}>
                  {isScraping ? 'Searching Web...' : 'Auto-Fetch Image from Web'}
                </Text>
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
              <Text style={[styles.secTitle, { color: colors.textSecondary }]}>IDENTIFICATION</Text>
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
          </View>
        )}

        {/* Save */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} activeOpacity={0.8}>
          <Feather name="check" size={20} color="#FFF" />
          <Text style={styles.saveBtnText}>Save Product</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
