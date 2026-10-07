import React from 'react';

import Statistics from '@/components/screens/Statistics';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function StatisticsRoute() {
    const { entries } = useAppData();
    return <Statistics entries={entries} onBack={useGoBack()} />;
}
