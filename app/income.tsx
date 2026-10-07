import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

import InputIncome from '@/components/screens/InputIncome';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';
import { dateFromString, INCOME_LABEL, toDateString, validateAmountInput } from '@/utils/entries';

// 収入の入力・編集。/income?id=○○ で既存の記録を編集
export default function IncomeRoute() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { entries, addEntry, updateEntry } = useAppData();
    const goBack = useGoBack();

    const editing = id ? entries.find(e => e.id === id && e.type === 'income') : undefined;

    const [item, setItem] = useState(editing?.item ?? '');
    const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
    const [date, setDate] = useState(() => (editing ? dateFromString(editing.date) : null) ?? new Date());

    useEffect(() => {
        if (id && !editing) goBack();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = () => {
        if (!item.trim()) {
            Alert.alert('入力エラー', '収入元を入力してください');
            return;
        }
        const check = validateAmountInput(amount);
        if (!check.ok) {
            Alert.alert('入力エラー', check.message);
            return;
        }
        const input = { item: item.trim(), amount: check.value, category: INCOME_LABEL, type: 'income' as const, date: toDateString(date) };
        if (editing) updateEntry(editing.id, input);
        else addEntry(input);
        Keyboard.dismiss();
        goBack();
    };

    return (
        <InputIncome
            item={item}
            setItem={setItem}
            amount={amount}
            setAmount={setAmount}
            date={date}
            onChangeDate={setDate}
            isEditMode={!!editing}
            onSave={handleSave}
            onCancel={goBack}
        />
    );
}
