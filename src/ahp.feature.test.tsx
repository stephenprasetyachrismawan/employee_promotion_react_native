import React from 'react';
import AHPNavigator from './navigation/AHPNavigator';
import { PairwiseTable } from './components/ahp/PairwiseTable';
import { ConsistencyCard } from './components/ahp/ConsistencyCard';
import { PriorityBar } from './components/ahp/PriorityBar';
import { StepIndicator } from './components/ahp/StepIndicator';
import { AHPService } from './database/services/AHPService';
import AHPProjectListScreen from './screens/ahp/AHPProjectListScreen';
import AHPWeightingScreen from './screens/ahp/AHPWeightingScreen';

React.createElement(AHPNavigator);
React.createElement(AHPProjectListScreen, { navigation: {} });
React.createElement(AHPWeightingScreen, {
    route: { params: { groupId: 'group-1' } },
    navigation: {},
});
React.createElement(PairwiseTable, {
    labels: ['Experience', 'Skill'],
    matrix: [
        [1, 3],
        [1 / 3, 1],
    ],
    onChange: () => undefined,
});
React.createElement(ConsistencyCard, {
    lambdaMax: 2,
    ci: 0,
    ri: 0,
    cr: 0,
    n: 2,
    isConsistent: true,
});
React.createElement(PriorityBar, {
    items: [{ id: 'a', name: 'Experience', weight: 0.6 }],
});
React.createElement(StepIndicator, {
    steps: ['Setup', 'Pairwise'],
    currentStep: 0,
});

const serviceCreateProject: (
    userId: string,
    name: string,
    goal: string,
    hasSub: boolean
) => Promise<string> = AHPService.createProject;

void serviceCreateProject;
