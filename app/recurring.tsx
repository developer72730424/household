import React from 'react';

import Recurring from '@/components/screens/Recurring';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function RecurringRoute() {
    const { recurring, categories, addRecurring, deleteRecurring } = useAppData();
    return <Recurring rules={recurring} categories={categories} onAdd={addRecurring} onDelete={deleteRecurring} onBack={useGoBack()} />;
}
