import React from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { radius, type } from "../theme";

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  onClear?: () => void;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: ViewStyle;
  autoFocus?: boolean;
} & Pick<TextInputProps, "returnKeyType">;

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onSubmit,
  onClear,
  leadingIcon,
  trailing,
  style,
  autoFocus,
  returnKeyType = "search",
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceMuted }, style]}>
      {leadingIcon ?? (
        <Ionicons name="search" size={18} color={colors.textMuted} />
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.textPrimary }]}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 ? (
        <TouchableOpacity
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    ...type.body,
    paddingVertical: 0,
  },
});
