import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tapHaptic } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Segmented } from '@/components/Segmented';
import { getQuestion, SUBJECT_SHORT, SUBJECTS, type Question, type Subject } from '@/data/questions';
import { useAppStore } from '@/store/useAppStore';
import { colors, MAX_WIDTH, radius, shadow, space, type } from '@/theme';

type Tab = 'bookmarks' | 'mistakes';
const LETTERS = ['A', 'B', 'C', 'D'];

const ReviewCard = memo(function ReviewCard({
  q,
  bookmarked,
  onToggleBookmark,
}: {
  q: Question;
  bookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} style={styles.card}>
      {/* The star sits beside (not inside) the expand button: nested buttons are invalid on web. */}
      <View style={styles.cardHead}>
        <Text style={styles.meta}>
          {SUBJECT_SHORT[q.subject]} · {q.difficulty}
        </Text>
        <Pressable
          onPress={() => onToggleBookmark(q.id)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          style={styles.star}
        >
          <Ionicons name={bookmarked ? 'star' : 'star-outline'} size={22} color={bookmarked ? colors.accent : colors.muted} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => {
          tapHaptic();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? 'Hides the answer' : 'Shows the answer and explanation'}
      >
        <Text style={styles.q} numberOfLines={open ? undefined : 3}>
          {q.question}
        </Text>
        {open && (
          <Animated.View entering={FadeIn.duration(220)} style={styles.answer}>
            <View style={styles.answerRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.answerText}>
                {LETTERS[q.answerIndex]}. {q.options[q.answerIndex]}
              </Text>
            </View>
            <Text style={styles.explain}>{q.explanation}</Text>
          </Animated.View>
        )}
        <View style={styles.chevron}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function Review() {
  const params = useLocalSearchParams<{ tab?: string; t?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'mistakes' ? 'mistakes' : 'bookmarks');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<Subject | null>(null);
  const bookmarks = useAppStore((s) => s.bookmarks);
  const mistakes = useAppStore((s) => s.mistakes);
  const toggleBookmark = useAppStore((s) => s.toggleBookmark);

  // Deep link from the result screen (/review?tab=mistakes). Adjusting state during render
  // when the param changes is React's recommended alternative to a syncing useEffect.
  const paramKey = `${params.tab}:${params.t}`;
  const [lastParam, setLastParam] = useState(paramKey);
  if (paramKey !== lastParam) {
    setLastParam(paramKey);
    if (params.tab === 'mistakes' || params.tab === 'bookmarks') setTab(params.tab);
  }

  const items = useMemo(() => {
    const ids = tab === 'bookmarks' ? bookmarks : mistakes;
    const needle = query.trim().toLowerCase();
    return ids
      .map(getQuestion)
      .filter((q): q is Question => !!q)
      .filter((q) => !subject || q.subject === subject)
      .filter(
        (q) =>
          !needle ||
          q.question.toLowerCase().includes(needle) ||
          q.subject.toLowerCase().includes(needle) ||
          SUBJECT_SHORT[q.subject].toLowerCase().includes(needle),
      );
  }, [tab, bookmarks, mistakes, query, subject]);

  const sourceEmpty = (tab === 'bookmarks' ? bookmarks : mistakes).length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(q) => q.id}
        renderItem={({ item }) => (
          <ReviewCard q={item} bookmarked={bookmarks.includes(item.id)} onToggleBookmark={toggleBookmark} />
        )}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Review</Text>
            <Segmented
              options={[
                { value: 'bookmarks', label: `Bookmarked (${bookmarks.length})` },
                { value: 'mistakes', label: `Mistakes (${mistakes.length})` },
              ]}
              value={tab}
              onChange={setTab}
            />
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search questions or subjects"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                accessibilityLabel="Search questions or subjects"
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="All" selected={!subject} onPress={() => setSubject(null)} />
              {SUBJECTS.map((s) => (
                <Chip key={s} label={SUBJECT_SHORT[s]} selected={subject === s} onPress={() => setSubject(subject === s ? null : s)} />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.duration(300)} style={styles.empty}>
            <Ionicons
              name={sourceEmpty ? (tab === 'bookmarks' ? 'star-outline' : 'happy-outline') : 'search-outline'}
              size={44}
              color={colors.muted}
            />
            <Text style={styles.emptyTitle}>
              {sourceEmpty ? (tab === 'bookmarks' ? 'No bookmarks yet' : 'No mistakes to review') : 'Nothing matches'}
            </Text>
            <Text style={styles.emptyBody}>
              {sourceEmpty
                ? tab === 'bookmarks'
                  ? 'Tap the star on any question during practice to save it here.'
                  : "Questions you get wrong show up here, and leave once you've got them right."
                : 'Try a different search or subject.'}
            </Text>
          </Animated.View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', padding: space.lg, paddingBottom: space.xxl },
  header: { gap: space.md, marginBottom: space.lg },
  title: { ...type.title, color: colors.text },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    minHeight: 48,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: space.sm },
  chips: { gap: space.sm, paddingRight: space.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  meta: { ...type.caption, color: colors.muted, textTransform: 'capitalize' },
  star: { minWidth: 44, minHeight: 36, alignItems: 'flex-end', justifyContent: 'center' },
  q: { ...type.body, fontWeight: '600', color: colors.text },
  answer: { marginTop: space.md, gap: space.sm, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: space.md },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  answerText: { ...type.label, color: '#166534', flex: 1 },
  explain: { ...type.body, fontSize: 15, color: colors.text },
  chevron: { alignItems: 'center', marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyTitle: { ...type.heading, color: colors.text },
  emptyBody: { ...type.body, color: colors.muted, textAlign: 'center' },
});
