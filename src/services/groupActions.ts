import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CriteriaGroup } from '../types';
import { confirmDialog, showAlert } from '../utils/dialog';

type GroupType = NonNullable<CriteriaGroup['groupType']>;

interface DeleteGroupParams {
    userId: string;
    groupId: string;
    groupName: string;
    groupType: GroupType;
    onDeleted: () => Promise<void>;
}

interface DuplicateGroupParams {
    userId: string;
    groupId: string;
    groupName: string;
    groupType: GroupType;
    onDuplicated: (newGroupId: string) => Promise<void>;
}

const getMessages = (groupType: GroupType) => {
    if (groupType === 'input') {
        return {
            deleteTitle: 'Delete Input Group',
            deleteMessage: (name: string) => `Hapus grup "${name}" beserta semua data di dalamnya?`,
            deleteError: 'Failed to delete input group',
            duplicateTitle: 'Duplicate Input Group',
            duplicateMessage: (name: string) => `Duplikat grup "${name}" beserta kriteria?`,
            duplicateError: 'Failed to duplicate input group',
        };
    }

    return {
        deleteTitle: 'Delete Criteria Group',
        deleteMessage: (name: string) =>
            `Are you sure you want to delete "${name}"? This will remove all criteria and data in this group.`,
        deleteError: 'Failed to delete criteria group',
        duplicateTitle: 'Duplicate Criteria Group',
        duplicateMessage: (name: string) => `Duplicate "${name}" along with all criteria?`,
        duplicateError: 'Failed to duplicate criteria group',
    };
};

export const deleteGroupWithConfirmation = async ({
    userId,
    groupId,
    groupName,
    groupType,
    onDeleted,
}: DeleteGroupParams): Promise<boolean> => {
    const messages = getMessages(groupType);
    const confirmed = await confirmDialog({
        title: messages.deleteTitle,
        message: messages.deleteMessage(groupName),
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true,
    });

    if (!confirmed) {
        return false;
    }

    try {
        await CriteriaGroupService.delete(userId, groupId);
        await onDeleted();
        return true;
    } catch (error) {
        console.error(`Error deleting ${groupType} group:`, error);
        showAlert('Error', messages.deleteError);
        return false;
    }
};

export const duplicateGroupWithConfirmation = async ({
    userId,
    groupId,
    groupName,
    groupType,
    onDuplicated,
}: DuplicateGroupParams): Promise<string | null> => {
    const messages = getMessages(groupType);
    const confirmed = await confirmDialog({
        title: messages.duplicateTitle,
        message: messages.duplicateMessage(groupName),
        confirmText: 'Duplicate',
        cancelText: 'Cancel',
    });

    if (!confirmed) {
        return null;
    }

    try {
        const newGroupId = await CriteriaGroupService.duplicate(userId, groupId, groupType);
        await onDuplicated(newGroupId);
        return newGroupId;
    } catch (error) {
        console.error(`Error duplicating ${groupType} group:`, error);
        showAlert('Error', messages.duplicateError);
        return null;
    }
};
