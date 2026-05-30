import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import type { RootStackParamList } from "../navigation/types";
import { getSdk } from "../lib/sdk";
import { QK } from "../lib/query-keys";
import { useTheme } from "../context/ThemeContext";
import { t } from "../lib/i18n";
import { radius, spacing, type } from "../theme";
import { showToast } from "../components/Toast";
import { ModalSheet } from "../components/ModalSheet";
import { ConfirmDialog } from "../components/ConfirmDialog";

function getAccountIcon(kind: string): keyof typeof Ionicons.glyphMap {
  switch (kind.toUpperCase()) {
    case "CASH":
      return "cash-outline";
    case "BANK":
      return "business-outline";
    case "MOBILE_MONEY":
      return "phone-portrait-outline";
    default:
      return "wallet-outline";
  }
}

const KIND_OPTIONS = [
  {
    value: "CASH",
    label: "Cash",
    icon: "cash-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "BANK",
    label: "Bank",
    icon: "business-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
    icon: "phone-portrait-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "OTHER",
    label: "Other",
    icon: "wallet-outline" as keyof typeof Ionicons.glyphMap,
  },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

export default function PaymentAccountsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showKindPicker, setShowKindPicker] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [formName, setFormName] = useState("");
  const [formKind, setFormKind] = useState("CASH");
  const [formHolderName, setFormHolderName] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formAccountNumber, setFormAccountNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const { data, isRefetching, refetch } = useQuery({
    queryKey: QK.paymentAccounts(),
    queryFn: () => getSdk().paymentAccounts.list(),
  });
  const accounts = data ?? [];

  const createMutation = useMutation({
    mutationFn: (dto: any) => getSdk().paymentAccounts.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t("paymentAccountCreated"), "success");
    },
    onError: () => showToast(t("failedToCreate"), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      getSdk().paymentAccounts.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      setShowAddEditModal(false);
      resetForm();
      showToast(t("paymentAccountUpdated"), "success");
    },
    onError: () => showToast(t("failedToUpdate"), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => getSdk().paymentAccounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK.paymentAccounts() });
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      showToast(t("paymentAccountDeleted"), "success");
    },
    onError: () => showToast(t("failedToDelete"), "error"),
  });

  const resetForm = () => {
    setFormName("");
    setFormKind("CASH");
    setFormHolderName("");
    setFormBankName("");
    setFormAccountNumber("");
    setFormNotes("");
    setFormIsActive(true);
    setEditingAccount(null);
    setShowKindPicker(false);
  };

  const openAdd = () => {
    resetForm();
    setShowAddEditModal(true);
  };
  const openEdit = (item: any) => {
    setEditingAccount(item);
    setFormName(item.name);
    setFormKind(item.kind);
    setFormHolderName(item.holderName ?? "");
    setFormBankName(item.bankName ?? "");
    setFormAccountNumber(item.accountNumber ?? "");
    setFormNotes(item.notes ?? "");
    setFormIsActive(item.isActive);
    setShowKindPicker(false);
    setShowAddEditModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      showToast(t("enterAccountName"), "error");
      return;
    }
    const dto = {
      name: formName.trim(),
      kind: formKind,
      holderName: formHolderName.trim() || undefined,
      bankName: formBankName.trim() || undefined,
      accountNumber: formAccountNumber.trim() || undefined,
      notes: formNotes.trim() || undefined,
      ...(editingAccount ? { isActive: formIsActive } : {}),
    };
    if (editingAccount) updateMutation.mutate({ id: editingAccount.id, dto });
    else createMutation.mutate(dto);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const inputStyle = [
    styles.inputRow,
    { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  ] as any;
  const selectedKind = KIND_OPTIONS.find((k) => k.value === formKind);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t("paymentAccountsTitle")}
        </Text>
        <TouchableOpacity
          onPress={openAdd}
          hitSlop={8}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {accounts.map((item) => (
          <View
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface }]}
          >
            <View style={styles.cardTop}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons
                  name={getAccountIcon(item.kind)}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.cardKind, { color: colors.textSecondary }]}
                >
                  {item.kind.replace("_", " ")}
                </Text>
              </View>
              {!item.isActive && (
                <View
                  style={[
                    styles.inactivePill,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[styles.inactiveText, { color: colors.textMuted }]}
                  >
                    {t("inactive")}
                  </Text>
                </View>
              )}
            </View>
            {(item.holderName || item.bankName || item.accountNumber) && (
              <View
                style={[styles.cardDetails, { borderTopColor: colors.border }]}
              >
                {[
                  item.holderName,
                  item.bankName,
                  item.accountNumber
                    ? `****${item.accountNumber.slice(-4)}`
                    : null,
                ]
                  .filter(Boolean)
                  .map((v, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.detailText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {v}
                    </Text>
                  ))}
              </View>
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.surfaceMuted },
                ]}
                onPress={() => openEdit(item)}
              >
                <Ionicons
                  name="pencil-outline"
                  size={15}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: colors.dangerLight },
                ]}
                onPress={() => {
                  setDeleteTarget({ id: item.id, name: item.name });
                  setShowDeleteDialog(true);
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={15}
                  color={colors.danger}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <ModalSheet
        visible={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={
          editingAccount ? t("editPaymentAccount") : t("addPaymentAccount")
        }
        footer={
          <TouchableOpacity
            style={[
              styles.footerBtn,
              { backgroundColor: colors.primary },
              isSaving && styles.btnDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.footerBtnText}>{t("save")}</Text>
            )}
          </TouchableOpacity>
        }
      >
        <Field label={t("accountName")}>
          <View style={inputStyle}>
            <Ionicons
              name="wallet-outline"
              size={16}
              color={colors.textMuted}
              style={{ marginRight: spacing[2] }}
            />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formName}
              onChangeText={setFormName}
              placeholder={t("enterAccountName")}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </Field>

        <Field label={t("accountType")}>
          <TouchableOpacity
            style={[inputStyle, { justifyContent: "space-between" }]}
            onPress={() => setShowKindPicker((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={styles.kindSelected}>
              <Ionicons
                name={selectedKind?.icon ?? "wallet-outline"}
                size={16}
                color={colors.textMuted}
                style={{ marginRight: spacing[2] }}
              />
              <Text
                style={[
                  styles.inputText,
                  { color: colors.textPrimary, flex: 0 },
                ]}
              >
                {selectedKind?.label ?? formKind}
              </Text>
            </View>
            <Ionicons
              name={showKindPicker ? "chevron-up" : "chevron-down"}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showKindPicker && (
            <View
              style={[
                styles.kindDropdown,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              {KIND_OPTIONS.map((opt, index) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.kindOption,
                    index < KIND_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                    formKind === opt.value && {
                      backgroundColor: colors.surfaceTinted,
                    },
                  ]}
                  onPress={() => {
                    setFormKind(opt.value);
                    setShowKindPicker(false);
                  }}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={
                      formKind === opt.value
                        ? colors.primary
                        : colors.textSecondary
                    }
                    style={{ marginRight: spacing[3] }}
                  />
                  <Text
                    style={[
                      styles.kindOptionText,
                      {
                        color:
                          formKind === opt.value
                            ? colors.primary
                            : colors.textPrimary,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {formKind === opt.value && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Field>

        <Field label={t("holderName")}>
          <View style={inputStyle}>
            <Ionicons
              name="person-outline"
              size={16}
              color={colors.textMuted}
              style={{ marginRight: spacing[2] }}
            />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={formHolderName}
              onChangeText={setFormHolderName}
              placeholder={t("holderName")}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </Field>

        {formKind === "BANK" && (
          <Field label={t("bankName")}>
            <View style={inputStyle}>
              <Ionicons
                name="business-outline"
                size={16}
                color={colors.textMuted}
                style={{ marginRight: spacing[2] }}
              />
              <TextInput
                style={[styles.inputText, { color: colors.textPrimary }]}
                value={formBankName}
                onChangeText={setFormBankName}
                placeholder={t("bankName")}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </Field>
        )}

        {(formKind === "BANK" || formKind === "MOBILE_MONEY") && (
          <Field label={t("accountNumber")}>
            <View style={inputStyle}>
              <Ionicons
                name="card-outline"
                size={16}
                color={colors.textMuted}
                style={{ marginRight: spacing[2] }}
              />
              <TextInput
                style={[styles.inputText, { color: colors.textPrimary }]}
                value={formAccountNumber}
                onChangeText={setFormAccountNumber}
                placeholder={t("accountNumber")}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </Field>
        )}

        <Field label={t("notes")}>
          <View style={[inputStyle, styles.textAreaRow]}>
            <TextInput
              style={[styles.textArea, { color: colors.textPrimary }]}
              value={formNotes}
              onChangeText={setFormNotes}
              placeholder={t("notes")}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </Field>

        {editingAccount && (
          <View
            style={[
              styles.switchRow,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <View>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>
                {t("active")}
              </Text>
              <Text
                style={[styles.switchDesc, { color: colors.textSecondary }]}
              >
                Enable this payment account
              </Text>
            </View>
            <Switch
              value={formIsActive}
              onValueChange={setFormIsActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        )}
      </ModalSheet>

      <ConfirmDialog
        visible={showDeleteDialog}
        title={t("deletePaymentAccount")}
        message={t("confirmDeletePaymentAccount")}
        destructive
        confirmText={t("delete")}
        cancelText={t("cancel")}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => {
          setShowDeleteDialog(false);
          setDeleteTarget(null);
        }}
        isLoading={deleteMutation.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...type.h3 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: spacing[5], gap: spacing[3], paddingBottom: spacing[8] },
  card: { borderRadius: radius.xl, padding: spacing[4] },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: { ...type.bodyBold },
  cardKind: { ...type.caption, marginTop: 1 },
  inactivePill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  inactiveText: { ...type.micro },
  cardDetails: {
    flexDirection: "row",
    gap: spacing[4],
    paddingTop: spacing[3],
    marginTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailText: { ...type.caption },
  cardActions: {
    flexDirection: "row",
    gap: spacing[2],
    justifyContent: "flex-end",
    marginTop: spacing[3],
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  // Form
  field: { marginBottom: spacing[4] },
  fieldLabel: { ...type.caption, fontWeight: "600", marginBottom: spacing[2] },
  hint: { ...type.micro, marginTop: spacing[1] },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    height: 50,
  },
  inputText: { ...type.body, flex: 1, paddingVertical: 0 },
  kindSelected: { flexDirection: "row", alignItems: "center", flex: 1 },
  kindDropdown: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginTop: spacing[1],
    overflow: "hidden",
  },
  kindOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  kindOptionText: { ...type.body, flex: 1 },
  textAreaRow: {
    height: "auto",
    alignItems: "flex-start",
    paddingVertical: spacing[3],
  },
  textArea: { ...type.body, flex: 1, minHeight: 72, textAlignVertical: "top" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[4],
  },
  switchLabel: { ...type.bodyMedium },
  switchDesc: { ...type.caption, marginTop: 2 },
  footerBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.6 },
  footerBtnText: { ...type.bodyBold, fontSize: 16, color: "#fff" },
});
