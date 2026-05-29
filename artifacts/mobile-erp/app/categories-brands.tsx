/**
 * Categories & Brands Management Screen
 */
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import type { Category, Brand } from '@/database/repositories';

export default function CategoriesBrandsScreen() {

  const router = useRouter();
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const [tab, setTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadData = useCallback(async () => {
    if (!repos) return;
    setCategories(await repos.categories.list());
    setBrands(await repos.brands.list());
  }, [repos]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!repos || !newName.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      if (tab === 'categories') await repos.categories.create(newName.trim(), newDesc.trim() || undefined);
      else await repos.brands.create(newName.trim(), newDesc.trim() || undefined);
      setShowAdd(false); setNewName(''); setNewDesc(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!repos) return;
    try {
      if (tab === 'categories') await repos.categories.delete(id);
      else await repos.brands.delete(id);
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const data = tab === 'categories' ? categories : brands;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {['categories', 'brands'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, { backgroundColor: tab === t ? colors.primary : 'transparent' }]} onPress={() => { setTab(t as any); setShowAdd(false); }}>
            <Text style={[styles.tabText, { color: tab === t ? '#FFF' : colors.textSecondary }]}>{t === 'categories' ? 'Categories' : 'Brands'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Name *" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Description" placeholderTextColor={colors.textMuted} value={newDesc} onChangeText={setNewDesc} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}><Text style={styles.saveBtnText}>Add {tab === 'categories' ? 'Category' : 'Brand'}</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={data as any[]}
        keyExtractor={i => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        ListEmptyComponent={<View style={styles.empty}><Feather name="grid" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No {tab} yet</Text></View>}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.itemIcon, { backgroundColor: colors.primary + '15' }]}>
              <Feather name={tab === 'categories' ? 'grid' : 'tag'} size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
              {'product_count' in item && <Text style={[styles.itemCount, { color: colors.textMuted }]}>{(item as any).product_count} products</Text>}
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Delete?', `Delete "${item.name}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) }])}>
              <Feather name="trash-2" size={16} color={colors.error} />
            </TouchableOpacity>
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
  tabs: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  addForm: { padding: 16, gap: 10, borderBottomWidth: 1 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  itemCount: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
