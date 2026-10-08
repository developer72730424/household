import React from 'react';

import CategoryBudgetsScreen from '@/components/screens/CategoryBudgets';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function CategoryBudgetsRoute() {
    const { categories, categoryBudgets, setCategoryBudget } = useAppData();
    return <CategoryBudgetsScreen categories={categories} budgets={categoryBudgets} onSet={setCategoryBudget} onBack={useGoBack()} />;
}
