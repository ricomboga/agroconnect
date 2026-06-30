import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  label?: string;
  style?: object;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DatePickerField({ value, onChange, maximumDate, minimumDate, style }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const [selected, setSelected] = useState(value);

  const today = new Date();
  const maxDate = maximumDate ?? today;
  const minDate = minimumDate ?? new Date(today.getFullYear() - 10, 0, 1);

  const totalDays = daysInMonth(viewYear, viewMonth);

  const firstDayOfWeek = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1).getDay();
    return d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
  }, [viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    if (new Date(nextY, nextM, 1) > maxDate) return;
    setViewMonth(nextM);
    setViewYear(nextY);
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    if (d > maxDate || d < minDate) return;
    setSelected(d);
  }

  function confirm() {
    onChange(selected);
    setOpen(false);
  }

  function cancel() {
    setSelected(value);
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
    setOpen(false);
  }

  const cells: Array<number | null> = [
    ...Array<null>(firstDayOfWeek).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const DAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <>
      <Pressable
        style={[dp.field, style]}
        onPress={() => {
          setSelected(value);
          setViewYear(value.getFullYear());
          setViewMonth(value.getMonth());
          setOpen(true);
        }}
        accessibilityRole="button"
      >
        <Text style={dp.calIcon}>📅</Text>
        <Text style={dp.fieldText}>{formatDisplay(value)}</Text>
        <Text style={dp.chevron}>›</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={cancel}>
        <Pressable style={dp.overlay} onPress={cancel} />
        <View style={dp.sheet}>
          {/* Header */}
          <View style={dp.sheetHeader}>
            <Pressable onPress={cancel} style={dp.headerBtn} accessibilityRole="button">
              <Text style={dp.cancelLabel}>Cancel</Text>
            </Pressable>
            <Text style={dp.sheetTitle}>Select Date</Text>
            <Pressable onPress={confirm} style={dp.headerBtn} accessibilityRole="button">
              <Text style={dp.doneLabel}>Done</Text>
            </Pressable>
          </View>

          {/* Month nav */}
          <View style={dp.monthNav}>
            <Pressable onPress={prevMonth} style={dp.navBtn} accessibilityRole="button">
              <Text style={dp.navArrow}>‹</Text>
            </Pressable>
            <Text style={dp.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <Pressable onPress={nextMonth} style={dp.navBtn} accessibilityRole="button">
              <Text style={dp.navArrow}>›</Text>
            </Pressable>
          </View>

          {/* Day-of-week labels */}
          <View style={dp.weekRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={dp.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <ScrollView>
            <View style={dp.grid}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`e${idx}`} style={dp.cell} />;
                const cellDate = new Date(viewYear, viewMonth, day);
                const isSelected =
                  selected.getFullYear() === viewYear &&
                  selected.getMonth() === viewMonth &&
                  selected.getDate() === day;
                const disabled = cellDate > maxDate || cellDate < minDate;
                return (
                  <Pressable
                    key={day}
                    style={[
                      dp.cell,
                      isSelected && dp.cellSelected,
                      disabled && dp.cellDisabled,
                    ]}
                    onPress={() => selectDay(day)}
                    disabled={disabled}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        dp.cellText,
                        isSelected && dp.cellTextSelected,
                        disabled && dp.cellTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const CELL = 40;

const dp = StyleSheet.create({
  field: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8,
    paddingHorizontal: 12, minHeight: 48, backgroundColor: '#fff',
  },
  calIcon:   { fontSize: 16, marginRight: 8 },
  fieldText: { flex: 1, fontSize: 14, color: '#111827' },
  chevron:   { fontSize: 18, color: '#9CA3AF' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    maxHeight: '70%',
  },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderColor: '#E5E7EB',
  },
  headerBtn:   { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  sheetTitle:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  cancelLabel: { fontSize: 14, color: '#6B7280' },
  doneLabel:   { fontSize: 14, fontWeight: '700', color: '#1A6B3C', textAlign: 'right' },

  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  navBtn:     { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow:   { fontSize: 22, color: '#1A6B3C', fontWeight: '700' },
  monthLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },

  weekRow: {
    flexDirection: 'row', paddingHorizontal: 8, marginBottom: 4,
  },
  weekLabel: {
    width: CELL, textAlign: 'center',
    fontSize: 10, fontWeight: '600', color: '#9CA3AF',
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 8, paddingBottom: 8,
  },
  cell: {
    width: CELL, height: CELL,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  cellSelected: { backgroundColor: '#1A6B3C' },
  cellDisabled: { opacity: 0.3 },
  cellText:         { fontSize: 13, color: '#111827' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextDisabled: { color: '#9CA3AF' },
});
