/**
 * User Management Screen — View, add, manage staff accounts
 */
import { Feather } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import type { User } from '@/database/repositories';

const ROLES = ['admin', 'manager', 'salesperson', 'accountant'];

export default function UsersScreen() {
  const { colors } = useTheme();
  const { repos } = useDatabaseStatus();
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('salesperson');

  const loadData = useCallback(async () => { if (repos) setUsers(await repos.users.list()); }, [repos]);
  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!repos || !newName.trim() || !newUsername.trim() || !newPin || newPin.length < 4) { Alert.alert('Error', 'Fill all fields (PIN must be 4+ digits)'); return; }
    try {
      await repos.users.create({ full_name: newName.trim(), username: newUsername.trim(), pin: newPin, role: newRole });
      setShowAdd(false); setNewName(''); setNewUsername(''); setNewPin(''); loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const toggleUser = async (u: User) => {
    if (!repos) return;
    await repos.users.toggleActive(u.id);
    loadData();
  };

  const roleColors: Record<string, string> = { admin: colors.primary, manager: colors.success, salesperson: colors.warning, accountant: colors.info };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {showAdd && (
        <View style={[styles.addForm, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Full Name *" placeholderTextColor={colors.textMuted} value={newName} onChangeText={setNewName} />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Username *" placeholderTextColor={colors.textMuted} value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" />
          <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="PIN (4+ digits) *" placeholderTextColor={colors.textMuted} value={newPin} onChangeText={setNewPin} keyboardType="numeric" secureTextEntry />
          <View style={styles.rolesRow}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.chip, { backgroundColor: newRole === r ? (roleColors[r] || colors.primary) : colors.inputBg, borderColor: newRole === r ? roleColors[r] : colors.border }]} onPress={() => setNewRole(r)}>
                <Text style={[styles.chipText, { color: newRole === r ? '#FFF' : colors.textSecondary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}><Text style={styles.saveBtnText}>Add User</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={u => String(u.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 8 }}
        renderItem={({ item: u }) => (
          <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: u.is_active ? 1 : 0.5 }]}>
            <View style={[styles.avatar, { backgroundColor: (roleColors[u.role] || colors.primary) + '22' }]}>
              <Feather name="user" size={20} color={roleColors[u.role] || colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]}>{u.full_name}</Text>
              <Text style={[styles.userMeta, { color: colors.textSecondary }]}>@{u.username}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: (roleColors[u.role] || colors.primary) + '22' }]}>
              <Text style={[styles.roleText, { color: roleColors[u.role] || colors.primary }]}>{u.role.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleUser(u)} style={{ padding: 4 }}>
              <Feather name={u.is_active ? 'toggle-right' : 'toggle-left'} size={22} color={u.is_active ? colors.success : colors.textMuted} />
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
  addForm: { padding: 16, gap: 10, borderBottomWidth: 1 },
  input: { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  rolesRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  saveBtn: { height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#FFF' },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  userMeta: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  fab: { position: 'absolute', bottom: 24, right: 16, width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
