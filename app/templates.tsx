import { useRouter } from 'expo-router';
import React from 'react';

import Templates from '@/components/screens/Templates';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function TemplatesRoute() {
    const router = useRouter();
    const { templates, categories, addTemplate, deleteTemplate } = useAppData();
    return (
        <Templates
            templates={templates}
            categories={categories}
            onAddTemplate={addTemplate}
            onDeleteTemplate={deleteTemplate}
            // テンプレートを選ぶと、その内容を入れた支出入力画面を開く
            onSelectTemplate={(t) => router.push({ pathname: '/add', params: { templateId: t.id } })}
            onBack={useGoBack()}
        />
    );
}
