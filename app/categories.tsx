import React from 'react';

import CategorySettings from '@/components/screens/CategorySettings';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function CategoriesRoute() {
    const { categories, addCategory, deleteCategory } = useAppData();
    return <CategorySettings categories={categories} onAdd={addCategory} onDelete={deleteCategory} onBack={useGoBack()} />;
}
