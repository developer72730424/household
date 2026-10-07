import React from 'react';

import SearchFilter from '@/components/screens/SearchFilter';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function SearchRoute() {
    const { entries, categories } = useAppData();
    return <SearchFilter entries={entries} categories={categories} onBack={useGoBack()} />;
}
