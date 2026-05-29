/**
 * More Screen — Navigation menu for all other features
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const MENU_ITEMS: { icon: keyof typeof Feather.glyphMap; label: string; desc: string; route: string; color: string }[] = [
  { icon: 'package', label: 'Inventory', desc: 'Stock management & adjustments', route: '/inventory', color: '#F59E0B' },
  { icon: 'file-text', label: 'Sales History', desc: 'View all invoices & returns', route: '/sales-history', color: '#3B82F6' },
  { icon: 'bar-chart-2', label: 'Reports', desc: 'Sales, profit, GST analytics', route: '/reports', color: '#10B981' },
  { icon: 'credit-card', label: 'Expenses', desc: 'Track business expenses', route: '/expenses', color: '#EF4444' },
  { icon: 'grid', label: 'Categories & Brands', desc: 'Manage product categories', route: '/categories-brands', color: '#8B5CF6' },
  { icon: 'truck', label: 'Suppliers', desc: 'Vendor management', route: '/suppliers', color: '#06B6D4' },
  { icon: 'users', label: 'User Management', desc: 'Staff accounts & roles', route: '/users', color: '#EC4899' },
  { icon: 'settings', label: 'Settings', desc: 'Shop details, theme, backups', route: '/settings', color: '#6B7280' },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>More</Text>
      </View>

      <View style={styles.grid}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
              <Feather name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.menuDesc, { color: colors.textMuted }]}>{item.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.error + '33' }]}
        onPress={() => { logout(); }}
        activeOpacity={0.7}
      >
        <Feather name="log-out" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Logout ({user?.full_name})</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textMuted }]}>NK Enterprises ERP v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10 },
  menuCard: { width: '47%', flexGrow: 1, padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  menuDesc: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 8, padding: 16, borderRadius: 14, borderWidth: 1 },
  logoutText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  version: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 20 },
});
