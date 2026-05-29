/**
 * Suppliers Screen — Vendor management
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import type { Supplier } from '@/database/repositories';

export default function SuppliersScreen() {

  const router = useRouter();
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGstin, setNewGstin] = useState('');

  const loadData = useCallback(async () => { if (repos) setSuppliers(await repos.suppliers.list(search || undefined)); }, [repos, search]);
  useEffect(() => { const t = setTimeout(loadData, 300); return () => clearTimeout(t); }, [loadData]);

  const handleAdd = async () => {
    if (!repos || !newName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      await repos.suppliers.create({ name: newName.trim(), phone: newPhone.trim() || undefined, email: newEmail.trim() || undefined, address: newAddress.trim() || undefined, gstin: newGstin.trim() || undefined } as any);
      setShowAdd(false); setNewName(''); setNewPhone(''); setNewEmail(''); setNewAddress(''); setNewGstin(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search suppliers..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Name *" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Phone" placeholderTextColor={colors.textMuted} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Email" placeholderTextColor={colors.textMuted} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Address" placeholderTextColor={colors.textMuted} value={newAddress} onChangeText={setNewAddress} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="GSTIN" placeholderTextColor={colors.textMuted} value={newGstin} onChangeText={setNewGstin} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}><Text style={styles.saveBtnText}>Add Supplier</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={suppliers}
        keyExtractor={s => String(s.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="truck" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No suppliers yet</Text></View>}
        renderItem={({ item: s }) => (
          <View style={[styles.suppCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.suppIcon, { backgroundColor: colors.info + '15' }]}><Feather name="truck" size={18} color={colors.info} /></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.suppName, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.suppMeta, { color: colors.textMuted }]}>{s.phone || 'No phone'}{s.email ? ` • ${s.email}` : ''}</Text>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setShowAdd(!showAdd)}>
        <Feather name={showAdd ? 'x' : 'plus'} size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 42, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  addForm: { padding: 16, gap: 10, borderBottomWidth: 1 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  suppCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  suppIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  suppName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  suppMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
