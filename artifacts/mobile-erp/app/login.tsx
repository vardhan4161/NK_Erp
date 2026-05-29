/**
 * Login Screen — PIN-based authentication
 * Simple numeric PIN pad with user selection
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabaseStatus } from '@/contexts/DatabaseContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { User } from '@/database/repositories';

export default function LoginScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { repos, isReady } = useDatabaseStatus();
  const { login } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [shake] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isReady && repos) {
      repos.users.list().then(u => setUsers(u.filter(x => x.is_active)));
    }
  }, [isReady]);

  const handlePinPress = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4 && selectedUser) {
      // Check PIN
      if (selectedUser.pin_hash === newPin) {
        login(selectedUser);
      } else {
        // Shake animation
        Animated.sequence([
          Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setPin(''), 300);
        Alert.alert('Wrong PIN', 'Please try again');
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const roleColors: Record<string, string> = {
    admin: colors.primary,
    manager: colors.success,
    salesperson: colors.warning,
    accountant: colors.info,
  };

  if (!selectedUser) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
        <Text style={[styles.title, { color: colors.text }]}>NK Enterprises</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select your account</Text>

        <FlatList
          data={users}
          keyExtractor={u => String(u.id)}
          contentContainerStyle={styles.userList}
          renderItem={({ item: u }) => (
            <TouchableOpacity
              style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setSelectedUser(u)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: (roleColors[u.role] || colors.primary) + '22' }]}>
                <Feather name="user" size={24} color={roleColors[u.role] || colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: colors.text }]}>{u.full_name}</Text>
                <Text style={[styles.userRole, { color: colors.textSecondary }]}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 40 }]}>
      <TouchableOpacity onPress={() => { setSelectedUser(null); setPin(''); }} style={styles.backBtn}>
        <Feather name="arrow-left" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={[styles.avatar, { backgroundColor: (roleColors[selectedUser.role] || colors.primary) + '22', width: 72, height: 72, borderRadius: 36, alignSelf: 'center' }]}>
        <Feather name="user" size={32} color={roleColors[selectedUser.role] || colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text, marginTop: 16 }]}>{selectedUser.full_name}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter your 4-digit PIN</Text>

      <Animated.View style={[styles.pinDots, { transform: [{ translateX: shake }] }]}>
        {[0, 1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.pinDot, {
              backgroundColor: i < pin.length ? colors.primary : 'transparent',
              borderColor: i < pin.length ? colors.primary : colors.textMuted,
            }]}
          />
        ))}
      </Animated.View>

      <View style={styles.numpad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => (
          <TouchableOpacity
            key={key || 'empty'}
            style={[styles.numKey, { backgroundColor: key ? colors.card : 'transparent', borderColor: key ? colors.border : 'transparent' }]}
            onPress={() => {
              if (key === 'del') handleDelete();
              else if (key) handlePinPress(key);
            }}
            activeOpacity={0.6}
            disabled={!key}
          >
            {key === 'del' ? (
              <Feather name="delete" size={22} color={colors.textSecondary} />
            ) : (
              <Text style={[styles.numText, { color: colors.text }]}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 20, padding: 8, zIndex: 10 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 6, marginBottom: 24 },
  userList: { paddingHorizontal: 24, paddingTop: 16, width: '100%', gap: 12 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  userRole: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  pinDots: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  pinDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, width: 280 },
  numKey: { width: 80, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  numText: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
});
