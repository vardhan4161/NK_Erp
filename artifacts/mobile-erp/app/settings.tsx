/**
 * Settings Screen — Shop details, theme, data management
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme, type ThemeMode, THEMES } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';

const THEME_OPTIONS: { key: ThemeMode; label: string; preview: string }[] = [
  { key: 'dark_blue', label: 'Dark Blue', preview: '#3B82F6' },
  { key: 'dark_emerald', label: 'Dark Emerald', preview: '#10B981' },
  { key: 'dark_amber', label: 'Dark Amber', preview: '#F59E0B' },
  { key: 'light', label: 'Light', preview: '#3B82F6' },
];

export default function SettingsScreen() {
  const { colors, theme, setTheme } = useTheme();
  const { repos } = useDatabaseStatus();
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopGstin, setShopGstin] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');

  useEffect(() => {
    if (!repos) return;
    repos.settings.getShopDetails().then(s => {
      setShopName(s.shop_name); setShopAddress(s.shop_address); setShopGstin(s.shop_gstin);
      setPhone1(s.shop_phone1); setPhone2(s.shop_phone2); setEmail(s.shop_email); setInvoicePrefix(s.invoice_prefix);
    });
  }, [repos]);

  const saveSettings = async () => {
    if (!repos) return;
    await repos.settings.setMultiple({
      shop_name: shopName, shop_address: shopAddress, shop_gstin: shopGstin,
      shop_phone1: phone1, shop_phone2: phone2, shop_email: email, invoice_prefix: invoicePrefix,
    });
    Alert.alert('Saved ✅', 'Settings updated successfully');
  };

  const handleThemeChange = async (t: ThemeMode) => {
    setTheme(t);
    if (repos) await repos.settings.set('theme', t);
  };

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}>
      {/* Shop Details */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.textSecondary }]}>SHOP DETAILS</Text>
        <Input label="Shop Name" value={shopName} onChangeText={setShopName} colors={colors} />
        <Input label="Address" value={shopAddress} onChangeText={setShopAddress} colors={colors} />
        <Input label="GSTIN" value={shopGstin} onChangeText={setShopGstin} colors={colors} />
        <Input label="Phone 1" value={phone1} onChangeText={setPhone1} colors={colors} keyboard="phone-pad" />
        <Input label="Phone 2" value={phone2} onChangeText={setPhone2} colors={colors} keyboard="phone-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} colors={colors} keyboard="email-address" />
        <Input label="Invoice Prefix" value={invoicePrefix} onChangeText={setInvoicePrefix} colors={colors} />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={saveSettings}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      {/* Theme */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.textSecondary }]}>THEME</Text>
        {THEME_OPTIONS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.themeRow, { borderColor: theme === t.key ? t.preview : colors.border, backgroundColor: theme === t.key ? t.preview + '12' : 'transparent' }]} onPress={() => handleThemeChange(t.key)}>
            <View style={[styles.themeColor, { backgroundColor: t.preview }]} />
            <Text style={[styles.themeLabel, { color: colors.text }]}>{t.label}</Text>
            {theme === t.key && <Feather name="check" size={18} color={t.preview} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* About */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.textSecondary }]}>ABOUT</Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary }]}>NK Enterprises ERP</Text>
        <Text style={[styles.aboutText, { color: colors.textMuted }]}>Version 1.0.0</Text>
        <Text style={[styles.aboutText, { color: colors.textMuted }]}>Built with React Native + Expo + SQLite</Text>
      </View>
    </ScrollView>
  );
}

function Input({ label, value, onChangeText, colors, keyboard }: any) {
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} value={value} onChangeText={onChangeText} placeholderTextColor={colors.textMuted} keyboardType={keyboard || 'default'} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  section: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 10 },
  secTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  saveBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  themeColor: { width: 24, height: 24, borderRadius: 12 },
  themeLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', flex: 1 },
  aboutText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
