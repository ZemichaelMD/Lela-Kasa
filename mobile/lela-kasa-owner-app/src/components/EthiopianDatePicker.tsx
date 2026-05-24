import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  toEth,
  toGreg,
  ethMonths,
  shortDays,
  ethiopianMonthLength,
  type EthiopianDate,
} from '../lib/ethiopian-date-utils';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing, type as typeScale } from '../theme';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

function parseIso(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const gregMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const gregShortDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function gregorianMonthLength(m: number, y: number): number {
  if (m === 2) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    return isLeap ? 29 : 28;
  }
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function EthiopianDatePicker({ value, onChange, placeholder = 'Select date' }: Props) {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [calendarMode, setCalendarMode] = useState<'ethiopian' | 'gregorian'>('ethiopian');

  const todayEth = useMemo(() => toEth(new Date()), []);
  const todayGreg = useMemo(() => new Date(), []);
  const selectedEth = useMemo(() => {
    const d = parseIso(value);
    return d ? toEth(d) : null;
  }, [value]);
  const selectedGreg = useMemo(() => parseIso(value), [value]);

  const [viewYear, setViewYear] = useState<number>(selectedEth?.Year ?? todayEth.Year);
  const [viewMonth, setViewMonth] = useState<number>(selectedEth?.Month ?? todayEth.Month);
  const [gregViewYear, setGregViewYear] = useState<number>(selectedGreg?.getFullYear() ?? todayGreg.getFullYear());
  const [gregViewMonth, setGregViewMonth] = useState<number>((selectedGreg?.getMonth() ?? todayGreg.getMonth()) + 1);

  function prevMonth() {
    if (calendarMode === 'ethiopian') {
      if (viewMonth === 1) {
        setViewMonth(13);
        setViewYear(y => y - 1);
      } else {
        setViewMonth(m => m - 1);
      }
    } else {
      if (gregViewMonth === 1) {
        setGregViewMonth(12);
        setGregViewYear(y => y - 1);
      } else {
        setGregViewMonth(m => m - 1);
      }
    }
  }

  function nextMonth() {
    if (calendarMode === 'ethiopian') {
      if (viewMonth === 13) {
        setViewMonth(1);
        setViewYear(y => y + 1);
      } else {
        setViewMonth(m => m + 1);
      }
    } else {
      if (gregViewMonth === 12) {
        setGregViewMonth(1);
        setGregViewYear(y => y + 1);
      } else {
        setGregViewMonth(m => m + 1);
      }
    }
  }

  function selectDay(day: number) {
    let greg: Date;
    if (calendarMode === 'ethiopian') {
      greg = toGreg({ Day: day, Month: viewMonth, Year: viewYear });
    } else {
      greg = new Date(gregViewYear, gregViewMonth - 1, day);
    }
    onChange(toIso(greg));
    setOpen(false);
  }

  function openPicker() {
    if (calendarMode === 'ethiopian') {
      const et = selectedEth ?? todayEth;
      setViewYear(et.Year);
      setViewMonth(et.Month);
    } else {
      const g = selectedGreg ?? todayGreg;
      setGregViewYear(g.getFullYear());
      setGregViewMonth(g.getMonth() + 1);
    }
    setOpen(true);
  }

  const displayLabel = useMemo(() => {
    const d = parseIso(value);
    if (!d) return placeholder;
    const et = toEth(d);
    if (language === 'am') {
      return `${ethMonths[et.Month - 1]} ${et.Day}, ${et.Year}`;
    }
    const greg = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${greg}  (${ethMonths[et.Month - 1]} ${et.Day}, ${et.Year})`;
  }, [value, placeholder, language]);

  const daysInMonth = calendarMode === 'ethiopian'
    ? ethiopianMonthLength(viewMonth, viewYear)
    : gregorianMonthLength(gregViewMonth, gregViewYear);

  const firstDayOfWeek = useMemo(() => {
    if (calendarMode === 'ethiopian') {
      return toGreg({ Day: 1, Month: viewMonth, Year: viewYear }).getDay();
    }
    return new Date(gregViewYear, gregViewMonth - 1, 1).getDay();
  }, [calendarMode, viewMonth, viewYear, gregViewMonth, gregViewYear]);

  const cells: Array<{ day: number } | null> = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = calendarMode === 'ethiopian'
    ? `${ethMonths[viewMonth - 1]} ${viewYear}`
    : `${gregMonths[gregViewMonth - 1]} ${gregViewYear}`;

  const dayHeaders = calendarMode === 'ethiopian' ? shortDays : gregShortDays;

  const isToday = (day: number) => {
    if (calendarMode === 'ethiopian') {
      return day === todayEth.Day && viewMonth === todayEth.Month && viewYear === todayEth.Year;
    }
    return day === todayGreg.getDate() && gregViewMonth === todayGreg.getMonth() + 1 && gregViewYear === todayGreg.getFullYear();
  };

  const isSelected = (day: number) => {
    if (calendarMode === 'ethiopian') {
      return selectedEth !== null && day === selectedEth.Day && viewMonth === selectedEth.Month && viewYear === selectedEth.Year;
    }
    return selectedGreg !== null && selectedGreg !== undefined && day === selectedGreg.getDate() && gregViewMonth === selectedGreg.getMonth() + 1 && gregViewYear === selectedGreg.getFullYear();
  };

  return (
    <>
      <TouchableOpacity style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={openPicker} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder, { color: value ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
          {displayLabel}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={[styles.overlay, { backgroundColor: colors.scrim }]}>
          <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, spacing[5]) }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Select Date</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.modeToggle, { backgroundColor: colors.surfaceMuted }]}
                  onPress={() => setCalendarMode(m => m === 'ethiopian' ? 'gregorian' : 'ethiopian')}
                >
                  <Text style={[styles.modeToggleText, { color: colors.textSecondary }]}>
                    {calendarMode === 'ethiopian' ? 'GC' : 'ET'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.navRow}>
              <TouchableOpacity onPress={prevMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
                {monthLabel}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={[styles.navBtn, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {dayHeaders.map((d, i) => (
                <Text key={i} style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, i) => {
                if (!cell) return <View key={i} style={styles.cell} />;
                const today = isToday(cell.day);
                const selected = isSelected(cell.day);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.cell,
                      today && { backgroundColor: colors.surfaceMuted },
                      selected && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => selectDay(cell.day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        { color: colors.textPrimary },
                        today && !selected && { color: colors.primary, fontWeight: '600' },
                        selected && { color: colors.textInverse, fontWeight: '600' },
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  triggerText: {
    flex: 1,
    fontSize: 13,
  },
  triggerPlaceholder: {
    fontStyle: 'italic',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing[2],
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  modeToggle: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  navBtn: {
    padding: spacing[2],
    borderRadius: radius.md,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[3],
    marginBottom: spacing[1],
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  cellText: {
    fontSize: 14,
  },
});
