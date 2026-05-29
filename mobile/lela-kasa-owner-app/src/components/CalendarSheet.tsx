import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Presets } from "react-native-pulsar";

import {
  toEth,
  toGreg,
  ethMonths,
  shortDays as ethShortDays,
  ethiopianMonthLength,
} from "../lib/ethiopian-date-utils";

import { ModalSheet } from "./ModalSheet";
import { useTheme } from "../context/ThemeContext";
import { radius, spacing, type } from "../theme";

const gregMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const gregShortDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const { width: deviceWidth } = Dimensions.get("window");

type ViewMode = "days" | "months" | "years";

interface CalendarSheetProps {
  visible: boolean;
  onClose: () => void;
  rangeFrom: string;
  rangeTo: string;
  onApply: (from: string, to: string) => void;
}

function monthLength(m: number, y: number): number {
  if (m === 2) {
    const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

    return isLeap ? 29 : 28;
  }

  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");

  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function parseIso(iso?: string): Date | undefined {
  if (!iso) return undefined;

  const d = new Date(iso + "T00:00:00");

  return isNaN(d.getTime()) ? undefined : d;
}

function fmtShort(d?: Date, mode: "ethiopian" | "gregorian" = "gregorian") {
  if (!d) return "Select";

  if (mode === "ethiopian") {
    const et = toEth(d);

    return `${ethMonths[et.Month - 1].slice(0, 3)} ${et.Day}`;
  }

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a?: Date, b?: Date) {
  if (!a || !b) return false;

  return a.toDateString() === b.toDateString();
}

function addMonth(
  year: number,
  month: number,
  delta: number,
  mode: "ethiopian" | "gregorian",
) {
  if (mode === "ethiopian") {
    let y = year;
    let m = month + delta;

    while (m < 1) {
      m += 13;
      y--;
    }

    while (m > 13) {
      m -= 13;
      y++;
    }

    return { year: y, month: m };
  }

  let y = year;
  let m = month + delta;

  while (m < 1) {
    m += 12;
    y--;
  }

  while (m > 12) {
    m -= 12;
    y++;
  }

  return { year: y, month: m };
}

const triggerSelection = () => {
  Presets.System.selection();
};

const triggerSuccess = () => {
  Presets.System.selection();
};

export function CalendarSheet({
  visible,
  onClose,
  rangeFrom,
  rangeTo,
  onApply,
}: CalendarSheetProps) {
  const { colors } = useTheme();

  const today = useMemo(() => new Date(), []);

  const todayEth = useMemo(() => toEth(today), [today]);

  const [calMode, setCalMode] = useState<"ethiopian" | "gregorian">(
    "ethiopian",
  );

  const [tempFrom, setTempFrom] = useState(rangeFrom);

  const [tempTo, setTempTo] = useState(rangeTo);

  const [selecting, setSelecting] = useState<"from" | "to">("from");

  const [viewMode, setViewMode] = useState<ViewMode>("days");

  const [viewYear, setViewYear] = useState(todayEth.Year);

  const [viewMonth, setViewMonth] = useState(todayEth.Month);

  const [gregViewYear, setGregViewYear] = useState(today.getFullYear());

  const [gregViewMonth, setGregViewMonth] = useState(today.getMonth() + 1);

  const [yearRange, setYearRange] = useState({
    from: todayEth.Year - 7,
    to: todayEth.Year + 8,
  });

  useEffect(() => {
    if (!visible) return;

    setTempFrom(rangeFrom);
    setTempTo(rangeTo);

    setSelecting("from");
    setViewMode("days");
  }, [visible, rangeFrom, rangeTo]);

  const curYear = calMode === "ethiopian" ? viewYear : gregViewYear;

  const curMonth = calMode === "ethiopian" ? viewMonth : gregViewMonth;

  const monthsList = calMode === "ethiopian" ? ethMonths : gregMonths;

  const daysHeader = calMode === "ethiopian" ? ethShortDays : gregShortDays;

  const currentMonthDays =
    calMode === "ethiopian"
      ? ethiopianMonthLength(viewMonth, viewYear)
      : monthLength(gregViewMonth, gregViewYear);

  const firstDayOfWeek = useMemo(() => {
    if (calMode === "ethiopian") {
      return toGreg({
        Day: 1,
        Month: viewMonth,
        Year: viewYear,
      }).getDay();
    }

    return new Date(gregViewYear, gregViewMonth - 1, 1).getDay();
  }, [calMode, viewMonth, viewYear, gregViewMonth, gregViewYear]);

  const cells = useMemo(() => {
    const result: Array<{
      day: number;
      greg: Date;
    } | null> = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      result.push(null);
    }

    for (let d = 1; d <= currentMonthDays; d++) {
      result.push({
        day: d,
        greg:
          calMode === "ethiopian"
            ? toGreg({
                Day: d,
                Month: viewMonth,
                Year: viewYear,
              })
            : new Date(gregViewYear, gregViewMonth - 1, d),
      });
    }

    while (result.length < 42) {
      result.push(null);
    }

    return result;
  }, [
    currentMonthDays,
    firstDayOfWeek,
    calMode,
    viewMonth,
    viewYear,
    gregViewMonth,
    gregViewYear,
  ]);

  const goToToday = useCallback(() => {
    triggerSelection();

    const et = toEth(new Date());

    setViewYear(et.Year);
    setViewMonth(et.Month);

    setGregViewYear(today.getFullYear());

    setGregViewMonth(today.getMonth() + 1);
  }, [today]);

  const toggleCalMode = useCallback(() => {
    triggerSelection();

    const next = calMode === "ethiopian" ? "gregorian" : "ethiopian";

    setCalMode(next);

    const refDate = parseIso(tempFrom) || new Date();

    if (next === "ethiopian") {
      const et = toEth(refDate);

      setViewYear(et.Year);
      setViewMonth(et.Month);
    } else {
      setGregViewYear(refDate.getFullYear());

      setGregViewMonth(refDate.getMonth() + 1);
    }
  }, [calMode, tempFrom]);

  const selectDay = useCallback(
    (date: Date) => {
      triggerSelection();

      const iso = toIso(date);

      if (!tempFrom || (tempFrom && tempTo && selecting === "from")) {
        setTempFrom(iso);
        setTempTo("");

        setSelecting("to");

        return;
      }

      if (selecting === "to") {
        if (iso < tempFrom) {
          setTempTo(tempFrom);

          setTempFrom(iso);
        } else {
          setTempTo(iso);
        }

        triggerSuccess();

        setSelecting("from");
      }
    },
    [tempFrom, tempTo, selecting],
  );

  const handleMonthSwipe = useCallback(
    (delta: number) => {
      triggerSelection();

      const next = addMonth(curYear, curMonth, delta, calMode);

      if (calMode === "ethiopian") {
        setViewYear(next.year);

        setViewMonth(next.month);
      } else {
        setGregViewYear(next.year);

        setGregViewMonth(next.month);
      }
    },
    [curMonth, curYear, calMode],
  );

  const canApply = !!tempFrom && !!tempTo;

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Select Date Range"
      maxHeightFraction={0.92}
    >
      <View style={st.container}>
        {/* RANGE */}
        <View style={st.rangeContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelecting("from")}
            style={[
              st.rangeCard,
              {
                backgroundColor:
                  selecting === "from"
                    ? colors.primary + "12"
                    : colors.surfaceMuted,

                borderColor:
                  selecting === "from" ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                st.rangeValue,
                {
                  color: tempFrom ? colors.textPrimary : colors.textMuted,
                },
              ]}
            >
              {fmtShort(parseIso(tempFrom), calMode)}
            </Text>

            <Text
              style={[
                st.rangeLabel,
                {
                  color: colors.textMuted,
                },
              ]}
            >
              Start date
            </Text>
          </TouchableOpacity>

          <View style={st.rangeDivider}>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelecting("to")}
            style={[
              st.rangeCard,
              {
                backgroundColor:
                  selecting === "to"
                    ? colors.primary + "12"
                    : colors.surfaceMuted,

                borderColor:
                  selecting === "to" ? colors.primary : "transparent",
              },
            ]}
          >
            <Text
              style={[
                st.rangeValue,
                {
                  color: tempTo ? colors.textPrimary : colors.textMuted,
                },
              ]}
            >
              {fmtShort(parseIso(tempTo), calMode)}
            </Text>

            <Text
              style={[
                st.rangeLabel,
                {
                  color: colors.textMuted,
                },
              ]}
            >
              End date
            </Text>
          </TouchableOpacity>
        </View>

        {/* MODE */}
        <View
          style={[
            st.segmented,
            {
              backgroundColor: colors.surfaceMuted,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={calMode !== "ethiopian" ? toggleCalMode : undefined}
            style={[
              st.segment,
              calMode === "ethiopian" && {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text
              style={[
                st.segmentText,
                {
                  color:
                    calMode === "ethiopian"
                      ? colors.textPrimary
                      : colors.textMuted,
                },
              ]}
            >
              Ethiopian
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={calMode !== "gregorian" ? toggleCalMode : undefined}
            style={[
              st.segment,
              calMode === "gregorian" && {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text
              style={[
                st.segmentText,
                {
                  color:
                    calMode === "gregorian"
                      ? colors.textPrimary
                      : colors.textMuted,
                },
              ]}
            >
              Gregorian
            </Text>
          </TouchableOpacity>
        </View>

        {/* DAYS */}
        {viewMode === "days" && (
          <>
            <View style={st.monthHeader}>
              <TouchableOpacity
                style={[
                  st.iconBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
                onPress={() => handleMonthSwipe(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <View
                style={{
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setViewMode("months")}
                >
                  <Text
                    style={[
                      st.monthText,
                      {
                        color: colors.textPrimary,
                      },
                    ]}
                  >
                    {monthsList[curMonth - 1]}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setViewMode("years")}
                >
                  <Text
                    style={[
                      st.yearText,
                      {
                        color: colors.textMuted,
                      },
                    ]}
                  >
                    {curYear}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  st.iconBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
                onPress={() => handleMonthSwipe(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View>
              <View style={st.weekRow}>
                {daysHeader.map((d) => (
                  <Text
                    key={d}
                    style={[
                      st.weekDay,
                      {
                        color: colors.textMuted,
                      },
                    ]}
                  >
                    {d}
                  </Text>
                ))}
              </View>

              <View style={st.grid}>
                {cells.map((cell, idx) => {
                  if (!cell) {
                    return <View key={idx} style={st.cell} />;
                  }

                  const from = parseIso(tempFrom);

                  const to = parseIso(tempTo);

                  const isStart = isSameDay(cell.greg, from);

                  const isEnd = isSameDay(cell.greg, to);

                  const isToday = isSameDay(cell.greg, today);

                  const inRange =
                    from && to && cell.greg >= from && cell.greg <= to;

                  const isSingle = isStart && isEnd;

                  return (
                    <View
                      key={idx}
                      style={[
                        st.cell,

                        inRange &&
                          !isSingle && {
                            backgroundColor: colors.primary + "14",
                          },

                        isStart &&
                          !isSingle && {
                            backgroundColor: colors.primary + "14",

                            borderTopLeftRadius: radius.full,

                            borderBottomLeftRadius: radius.full,
                          },

                        isEnd &&
                          !isSingle && {
                            backgroundColor: colors.primary + "14",

                            borderTopRightRadius: radius.full,

                            borderBottomRightRadius: radius.full,
                          },
                      ]}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => selectDay(cell.greg)}
                        style={[
                          st.dayCircle,

                          (isStart || isEnd) && {
                            backgroundColor: colors.primary,
                          },

                          isToday &&
                            !isStart &&
                            !isEnd && {
                              backgroundColor: colors.primary + "12",

                              borderWidth: 2,

                              borderColor: colors.primary,
                            },
                        ]}
                      >
                        <Text
                          style={[
                            st.dayText,

                            {
                              color:
                                isStart || isEnd
                                  ? colors.textInverse
                                  : inRange
                                    ? colors.primary
                                    : colors.textPrimary,
                            },

                            isToday &&
                              !isStart &&
                              !isEnd && {
                                color: colors.primary,

                                fontWeight: "800",
                              },
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ACTIONS */}
            <View style={st.quickActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={goToToday}
                style={[
                  st.quickBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name="today-outline"
                  size={15}
                  color={colors.textPrimary}
                />

                <Text
                  style={[
                    st.quickBtnText,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  triggerSelection();

                  setTempFrom("");

                  setTempTo("");

                  setSelecting("from");
                }}
                style={[
                  st.quickBtn,
                  {
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={15}
                  color={colors.textPrimary}
                />

                <Text
                  style={[
                    st.quickBtnText,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* MONTHS */}
        {viewMode === "months" && (
          <>
            <View style={st.topPickerHeader}>
              <TouchableOpacity onPress={() => setViewMode("days")}>
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <Text
                style={[
                  st.pickerTitle,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                Select Month
              </Text>

              <View
                style={{
                  width: 22,
                }}
              />
            </View>

            <View style={st.monthGrid}>
              {monthsList.map((month, idx) => {
                const active = idx + 1 === curMonth;

                return (
                  <TouchableOpacity
                    key={month}
                    activeOpacity={0.85}
                    style={[
                      st.monthCell,
                      active && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      triggerSelection();

                      if (calMode === "ethiopian") {
                        setViewMonth(idx + 1);
                      } else {
                        setGregViewMonth(idx + 1);
                      }

                      setViewMode("days");
                    }}
                  >
                    <Text
                      style={[
                        st.monthCellText,
                        {
                          color: active
                            ? colors.textInverse
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* YEARS */}
        {viewMode === "years" && (
          <>
            <View style={st.topPickerHeader}>
              <TouchableOpacity
                onPress={() =>
                  setYearRange((prev) => ({
                    from: prev.from - 16,

                    to: prev.to - 16,
                  }))
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <Text
                style={[
                  st.pickerTitle,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                {yearRange.from} - {yearRange.to}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setYearRange((prev) => ({
                    from: prev.from + 16,

                    to: prev.to + 16,
                  }))
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <View style={st.yearGrid}>
              {Array.from(
                {
                  length: yearRange.to - yearRange.from + 1,
                },
                (_, i) => {
                  const year = yearRange.from + i;

                  const active = year === curYear;

                  return (
                    <TouchableOpacity
                      key={year}
                      activeOpacity={0.85}
                      style={[
                        st.yearCell,
                        active && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      onPress={() => {
                        triggerSelection();

                        if (calMode === "ethiopian") {
                          setViewYear(year);
                        } else {
                          setGregViewYear(year);
                        }

                        setViewMode("days");
                      }}
                    >
                      <Text
                        style={[
                          st.yearCellText,
                          {
                            color: active
                              ? colors.textInverse
                              : colors.textPrimary,
                          },
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          </>
        )}

        {/* APPLY */}
        <TouchableOpacity
          disabled={!canApply}
          activeOpacity={0.9}
          onPress={() => {
            triggerSuccess();

            onApply(tempFrom, tempTo);

            onClose();
          }}
          style={[
            st.applyBtn,
            {
              backgroundColor: canApply ? colors.primary : colors.surfaceMuted,
            },
          ]}
        >
          <Text
            style={[
              st.applyBtnText,
              {
                color: canApply ? colors.textInverse : colors.textMuted,
              },
            ]}
          >
            Apply Range
          </Text>
        </TouchableOpacity>
      </View>
    </ModalSheet>
  );
}

const st = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[1],
    paddingBottom: spacing[6],
  },

  rangeContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: spacing[2],
  },

  rangeCard: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.xl,
    borderWidth: 0.5,
  },

  rangeDivider: {
    width: spacing[5],
    alignItems: "center",
    justifyContent: "center",
  },

  rangeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[1],
  },

  modeBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },

  modeBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  activeDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
  },

  rangeValue: {
    fontSize: 16,
    fontWeight: "800",
  },

  rangeLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },

  segmented: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing[4],
  },

  segment: {
    flex: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
  },

  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[3],
  },

  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  monthText: {
    fontSize: 22,
    fontWeight: "800",
  },

  yearText: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: spacing[2],
  },

  weekDay: {
    width: (deviceWidth - 8) / 7,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  cell: {
    width: (deviceWidth - 8) / 7,
    height: (deviceWidth - 8) / 7,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircle: {
    width: "76%",
    height: "76%",
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  dayText: {
    fontSize: 15,
    fontWeight: "700",
  },

  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing[3],
    marginTop: spacing[4],
  },

  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.full,
  },

  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  applyBtn: {
    marginTop: spacing[5],
    height: 54,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },

  applyBtnText: {
    ...type.bodyBold,
    fontSize: 16,
  },

  topPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[4],
  },

  pickerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing[2],
  },

  monthCell: {
    width: "31%",
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  monthCellText: {
    fontSize: 15,
    fontWeight: "700",
  },

  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing[2],
  },

  yearCell: {
    width: "23%",
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  yearCellText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
