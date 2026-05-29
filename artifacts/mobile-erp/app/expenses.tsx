/**
 * Expenses Screen — Track business expenses
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Expense } from '@/database/repositories';

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Salary', 'Transport', 'Marketing', 'Maintenance', 'Internet', 'Insurance', 'Tax', 'Other'];

export default function ExpensesScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!repos) return;
    const [e, m] = await Promise.all([repos.expenses.list(), repos.expenses.getMonthlyTotal()]);
    setExpenses(e); setMonthlyTotal(m); setRefreshing(false);
  }, [repos]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!repos || !category || !description.trim() || !amount) { Alert.alert('Error', 'Please fill all fields'); return; }
    try {
      await repos.expenses.create({ category, description: description.trim(), amount: parseFloat(amount), expense_date: new Date().toISOString().split('T')[0], payment_method: payMethod, created_by_id: user?.id });
      setShowAdd(false); setCategory(''); setDescription(''); setAmount(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Monthly Summary */}
      <View style={[styles.summary, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Month's Expenses</Text>
        <Text style={[styles.summaryValue, { color: colors.error }]}>{formatCurrency(monthlyTotal)}</Text>
      </View>

      {showAdd && (
        <ScrollView style={[styles.addForm, { backgroundColor: colors.card, borderBottomColor: colors.border }]} contentContainerStyle={{ gap: 10, padding: 16 }}>
          <Text style={[styles.formTitle, { color: colors.textSecondary }]}>ADD EXPENSE</Text>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: 'row', gap: 6 }}>
            {EXPENSE_CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.inputBg, borderColor: category === c ? colors.primary : colors.border }]} onPress={() => setCategory(c)}>
                <Text style={[styles.chipText, { color: category === c ? '#FFF' : colors.textSecondary }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View></ScrollView>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Description *" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Amount (₹) *" placeholderTextColor={colors.textMuted} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}><Text style={styles.saveBtnText}>Save Expense</Text></TouchableOpacity>
        </ScrollView>
      )}

      <FlatList
        data={expenses}
        keyExtractor={e => String(e.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={styles.empty}><Feather name="credit-card" size={40} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses recorded</Text></View>}
        renderItem={({ item: e }) => (
          <View style={[styles.expCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.expIcon, { backgroundColor: colors.error + '15' }]}><Feather name="trending-down" size={16} color={colors.error} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.expDesc, { color: colors.text }]}>{e.description}</Text><Text style={[styles.expCat, { color: colors.textMuted }]}>{e.category} • {formatDate(e.expense_date)}</Text></View>
            <Text style={[styles.expAmt, { color: colors.error }]}>-{formatCurrency(e.amount)}</Text>
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
  summary: { padding: 16, alignItems: 'center', borderBottomWidth: 1 },
  summaryLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  summaryValue: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  addForm: { maxHeight: 320, borderBottomWidth: 1 },
  formTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  expCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  expIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  expDesc: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  expCat: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  expAmt: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  fab: { position: 'absolute', bottom: 90, right: 16, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
