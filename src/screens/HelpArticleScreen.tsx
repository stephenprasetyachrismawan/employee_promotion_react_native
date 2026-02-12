import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../styles/theme';
import { getHelpArticle } from '../content/helpArticles';

export default function HelpArticleScreen({ route }: any) {
    const { topic } = route.params || {};
    const article = getHelpArticle(topic);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <View style={styles.heroCard}>
                    <Text style={styles.title}>{article.title}</Text>
                    <Text style={styles.subtitle}>{article.subtitle}</Text>
                </View>

                {article.sections.map((section) => (
                    <View key={section.title} style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.paragraphs.map((paragraph) => (
                            <Text key={paragraph} style={styles.paragraph}>
                                {paragraph}
                            </Text>
                        ))}
                        {section.bullets?.map((bullet) => (
                            <Text key={bullet} style={styles.bullet}>
                                • {bullet}
                            </Text>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
        paddingBottom: spacing['4xl'],
        gap: spacing.md,
    },

    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        ...shadows.sm,
    },

    title: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
        lineHeight: 22,
    },

    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        ...shadows.sm,
    },

    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    paragraph: {
        fontSize: typography.base,
        color: colors.textSecondary,
        lineHeight: 23,
        marginBottom: spacing.sm,
    },

    bullet: {
        fontSize: typography.base,
        color: colors.textSecondary,
        lineHeight: 23,
        marginBottom: spacing.xs,
    },
});
