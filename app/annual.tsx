import React from 'react';

import Annual from '@/components/screens/Annual';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function AnnualRoute() {
    const { entries } = useAppData();
    return <Annual entries={entries} onBack={useGoBack()} />;
}
