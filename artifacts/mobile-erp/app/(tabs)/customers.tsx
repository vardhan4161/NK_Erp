/**
 * Customers Screen — List, search, manage customers
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { formatCurrency } from '@/utils/formatters';
import type { Customer } from '@/database/repositories';

export default function CustomersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos } = useDatabaseStatus();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const loadData = useCallback(async () => {
    if (!repos) return;
    const custs = await repos.customers.list(search || undefined);
    setCustomers(custs);
    setRefreshing(false);
  }, [repos, search]);

  useEffect(() => { const t = setTimeout(loadData, 300); return () => clearTimeout(t); }, [loadData]);

  const handleAdd = async () => {
    if (!repos || !newName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      await repos.customers.create({ name: newName.trim(), phone: newPhone.trim() || undefined, email: newEmail.trim() || undefined, address: newAddress.trim() || undefined });
      setShowAdd(false);
      setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress('');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
          <Feather name={showAdd ? 'x' : 'plus'} size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Name *" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Phone" placeholderTextColor={colors.textMuted} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Email" placeholderTextColor={colors.textMuted} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Address" placeholderTextColor={colors.textMuted} value={newAddress} onChangeText={setNewAddress} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}><Text style={styles.saveBtnText}>Add Customer</Text></TouchableOpacity>
        </View>
      )}

      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by name or phone..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <FlatList
        data={customers}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}><Feather name="users" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No customers yet</Text></View>
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity style={[styles.custCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.push(`/customer/${c.id}` as any)} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{c.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.custName, { color: colors.text }]}>{c.name}</Text>
              <Text style={[styles.custPhone, { color: colors.textSecondary }]}>{c.phone || 'No phone'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.custTotal, { color: colors.text }]}>{formatCurrency(c.total_purchases)}</Text>
              {c.due_amount > 0 && <Text style={[styles.custDue, { color: colors.error }]}>Due: {formatCurrency(c.due_amount)}</Text>}
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
  addForm: { padding: 16, gap: 10, borderBottomWidth: 1 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  custCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  custName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  custPhone: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  custTotal: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  custDue: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
});
