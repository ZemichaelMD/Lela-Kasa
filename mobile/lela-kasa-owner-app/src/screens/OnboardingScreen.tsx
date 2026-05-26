import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { useTranslation } from '../lib/i18n';
import { useTheme } from '../context/ThemeContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { radius, spacing, type } from '../theme';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'storefront-outline' as const,
    titleKey: 'onboarding1Title',
    descKey: 'onboarding1Desc',
  },
  {
    icon: 'people-outline' as const,
    titleKey: 'onboarding2Title',
    descKey: 'onboarding2Desc',
  },
  {
    icon: 'bar-chart-outline' as const,
    titleKey: 'onboarding3Title',
    descKey: 'onboarding3Desc',
  },
  {
    icon: 'phone-portrait-outline' as const,
    titleKey: 'onboarding4Title',
    descKey: 'onboarding4Desc',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      navigation.navigate('Login');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const renderItem = ({ item }: { item: typeof slides[0] }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={item.icon} size={64} color={colors.primary} />
      </View>
      <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>{t(item.titleKey as any)}</Text>
      <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>{t(item.descKey as any)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <LanguageSwitcher />
        <TouchableOpacity onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.brand}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setActiveIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === activeIndex ? colors.primary : colors.border },
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {activeIndex === slides.length - 1 ? t('getStarted') : t('next')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={colors.textInverse} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3] },
  brand: { alignItems: 'center', paddingVertical: spacing[3] },
  brandLogo: { width: 72, height: 72, borderRadius: 16 },
  skipText: { ...type.body },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
  iconContainer: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[8] },
  slideTitle: { ...type.h2, textAlign: 'center', marginBottom: spacing[3] },
  slideDesc: { ...type.body, textAlign: 'center', lineHeight: 24 },
  footer: { paddingHorizontal: spacing[5], paddingVertical: spacing[6], alignItems: 'center' },
  dots: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[6] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], borderRadius: radius.md, paddingVertical: spacing[4], paddingHorizontal: spacing[8] },
  buttonText: { ...type.bodyBold, fontSize: 17 },
});
