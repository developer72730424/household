import React, { useMemo } from 'react';

import CategorySettings from '@/components/screens/CategorySettings';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';
import { countUsage } from '@/utils/categories';

export default function CategoriesRoute() {
    const { entries, categories, addCategory, renameCategory, deleteCategory } = useAppData();
    const usage = useMemo(() => countUsage(entries), [entries]);
    return (
        <CategorySettings
            categories={categories}
            usage={usage}
            onAdd={addCategory}
            onRename={renameCategory}
            onDelete={deleteCategory}
            onBack={useGoBack()}
        />
    );
}
