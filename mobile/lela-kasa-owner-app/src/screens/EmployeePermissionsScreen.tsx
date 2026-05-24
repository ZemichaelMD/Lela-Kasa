import React, { useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getSdk, type PermissionGroup } from '../lib/sdk';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from '../components/Toast';
import { radius, spacing, type } from '../theme';

export default function EmployeePermissionsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'EmployeePermissions'>>();
  const { employeeId, employeeName } = route.params;

  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [original, setOriginal] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [employeeId]);

  async function loadPermissions() {
    setLoading(true);
    try {
      const data = await getSdk().permissions.getEmployee(employeeId);
      setGroups(data);
      const map: Record<string, boolean> = {};
      for (const g of data) {
        for (const p of g.permissions) {
          map[p.slug] = p.granted;
        }
      }
      setOriginal(map);
      setDirty(false);
    } catch {
      showToast('Failed to load permissions', 'error');
    } finally {
      setLoading(false);
    }
  }

  function toggle(slug: string, current: boolean) {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        permissions: g.permissions.map(p =>
          p.slug === slug ? { ...p, granted: !current } : p,
        ),
      })),
    );
    setDirty(true);
  }

  function toggleGroup(groupName: string, grant: boolean) {
    setGroups(prev =>
      prev.map(g =>
        g.group === groupName
          ? { ...g, permissions: g.permissions.map(p => ({ ...p, granted: grant })) }
          : g,
      ),
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const updates: Array<{ slug: string; granted: boolean }> = [];
    for (const g of groups) {
      for (const p of g.permissions) {
        if (p.granted !== original[p.slug]) {
          updates.push({ slug: p.slug, granted: p.granted });
        }
      }
    }
    if (updates.length === 0) {
      setDirty(false);
      setSaving(false);
      return;
    }
    try {
      const data = await getSdk().permissions.updateEmployee(employeeId, { updates });
      setGroups(data);
      const map: Record<string, boolean> = {};
      for (const g of data) {
        for (const p of g.permissions) {
          map[p.slug] = p.granted;
        }
      }
      setOriginal(map);
      setDirty(false);
      showToast('Permissions saved', 'success');
    } catch {
      showToast('Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        permissions: g.permissions.map(p => ({ ...p, granted: original[p.slug] ?? p.granted })),
      })),
    );
    setDirty(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Permissions</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Permissions</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{employeeName}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {dirty && (
        <View style={[styles.dirtyBar, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
          <Text style={[styles.dirtyText, { color: colors.warning }]}>You have unsaved changes</Text>
          <View style={styles.dirtyActions}>
            <TouchableOpacity onPress={handleCancel} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary, ...type.caption }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.textInverse, ...type.caption }}>{saving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {groups.map(group => {
          const allGranted = group.permissions.every(p => p.granted);
          return (
            <View key={group.group} style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: colors.textMuted }]}>{group.group}</Text>
                <TouchableOpacity onPress={() => toggleGroup(group.group, !allGranted)}>
                  <Text style={[styles.groupToggle, { color: colors.primary }]}>
                    {allGranted ? 'Revoke All' : 'Grant All'}
                  </Text>
                </TouchableOpacity>
              </View>
              {group.permissions.map(perm => (
                <View key={perm.slug} style={styles.permRow}>
                  <View style={styles.permInfo}>
                    <Text style={[styles.permLabel, { color: colors.textPrimary }]}>{perm.label}</Text>
                    <Text style={[styles.permDesc, { color: colors.textMuted }]}>{perm.description}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => toggle(perm.slug, perm.granted)}
                    style={[styles.toggleTrack, { backgroundColor: perm.granted ? colors.primary : colors.surfaceMuted }]}
                  >
                    <View style={[styles.toggleThumb, { backgroundColor: '#fff' }, perm.granted ? styles.toggleOn : styles.toggleOff]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {!dirty && groups.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !dirty}
            style={[styles.fullSaveBtn, { backgroundColor: dirty ? colors.primary : colors.surfaceMuted }]}
          >
            <Text style={{ color: dirty ? colors.textInverse : colors.textMuted, ...type.bodyBold }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { ...type.h3 },
  headerSub: { ...type.caption, marginTop: 2 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing[4], gap: spacing[3], paddingBottom: spacing[8] },
  dirtyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  dirtyText: { ...type.caption },
  dirtyActions: { flexDirection: 'row', gap: spacing[2] },
  cancelBtn: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  saveBtn: { borderRadius: radius.sm, paddingHorizontal: spacing[3], paddingVertical: spacing[1] },
  groupCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[4],
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  groupTitle: { ...type.caption, textTransform: 'uppercase', letterSpacing: 1 },
  groupToggle: { ...type.micro },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  permInfo: { flex: 1, marginRight: spacing[3] },
  permLabel: { ...type.bodyMedium },
  permDesc: { ...type.micro, marginTop: 2 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleOn: { alignSelf: 'flex-end' },
  toggleOff: { alignSelf: 'flex-start' },
  bottomBar: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
  fullSaveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
});
