import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from './theme';

export const globalStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    spaceBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    padding: {
        padding: spacing.lg,
    },

    paddingHorizontal: {
        paddingHorizontal: spacing.lg,
    },

    paddingVertical: {
        paddingVertical: spacing.lg,
    },

    marginBottom: {
        marginBottom: spacing.md,
    },

    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },

    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
});
