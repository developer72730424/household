import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Keyboard } from 'react-native';

import EntryExtras from '@/components/entry-extras';
import InputItem from '@/components/screens/InputItem';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';
import { dateFromString, newEntryId, toDateString, validateAmountInput, type PaymentMethod, type Template } from '@/utils/entries';
import { deleteReceipt, saveReceipt } from '@/utils/receipt-files';

// 支出の入力・編集。/add?id=○○ で既存の記録を編集、/add?templateId=○○ でテンプレートを入力済みにして開く
export default function AddExpenseRoute() {
    const { id, templateId } = useLocalSearchParams<{ id?: string; templateId?: string }>();
    const { entries, categories, templates, addEntry, updateEntry } = useAppData();
    const goBack = useGoBack();

    const editing = id ? entries.find(e => e.id === id && e.type === 'expense') : undefined;
    const template = templateId ? templates.find(t => t.id === templateId) : undefined;

    const [item, setItem] = useState(editing?.item ?? template?.item ?? '');
    const [amount, setAmount] = useState(editing ? String(editing.amount) : template?.amount ?? '');
    const [category, setCategory] = useState(editing?.category ?? template?.category ?? categories[0] ?? 'その他');
    const [date, setDate] = useState(() => (editing ? dateFromString(editing.date) : null) ?? new Date());
    const [memo, setMemo] = useState(editing?.memo ?? '');
    const [payment, setPayment] = useState<PaymentMethod | null>(editing?.payment ?? null);
    // レシート写真: 保存済みのファイル名 / 選んだばかり（保存ボタンを押すまでアプリのフォルダへは入れない）
    const [photoName, setPhotoName] = useState<string | null>(editing?.photo ?? null);
    const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

    // 編集しようとした記録が見つからないとき（削除済みなど）は前の画面へ戻る
    useEffect(() => {
        if (id && !editing) goBack();
        // 開いた時点の判定だけでよい
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 削除済みのカテゴリの記録を編集しても、そのカテゴリを選択肢に残す
    const categoryOptions = categories.includes(category) ? categories : [category, ...categories];

    const applyTemplate = (t: Template) => {
        setItem(t.item);
        setAmount(t.amount);
        setCategory(t.category);
    };

    const handleSave = () => {
        if (!item.trim()) {
            Alert.alert('入力エラー', '品目を入力してください');
            return;
        }
        const check = validateAmountInput(amount);
        if (!check.ok) {
            Alert.alert('入力エラー', check.message);
            return;
        }
        // 写真: 新しく選んだものは保存し、差し替え・削除された古い写真のファイルは消す
        let photo: string | undefined = photoName ?? undefined;
        try {
            if (pendingPhoto) photo = saveReceipt(pendingPhoto, newEntryId());
        } catch (e) {
            console.error(e);
            Alert.alert('写真を保存できませんでした', '写真なしで保存します。');
            photo = photoName ?? undefined;
        }
        if (editing?.photo && editing.photo !== photo) deleteReceipt(editing.photo);
        const input = {
            item: item.trim(), amount: check.value, category, type: 'expense' as const, date: toDateString(date),
            memo: memo.trim() || undefined, payment: payment ?? undefined, photo,
        };
        if (editing) updateEntry(editing.id, input);
        else addEntry(input);
        Keyboard.dismiss();
        goBack();
    };

    return (
        <InputItem
            item={item}
            setItem={setItem}
            amount={amount}
            setAmount={setAmount}
            selectedCategory={category}
            setSelectedCategory={setCategory}
            categories={categoryOptions}
            date={date}
            onChangeDate={setDate}
            isEditMode={!!editing}
            onSave={handleSave}
            onCancel={goBack}
            templates={templates}
            onSelectTemplate={applyTemplate}
            extras={
                <EntryExtras
                    memo={memo}
                    onChangeMemo={setMemo}
                    payment={payment}
                    onChangePayment={setPayment}
                    photoName={photoName}
                    pendingPhotoUri={pendingPhoto}
                    onPickPhoto={(uri) => setPendingPhoto(uri)}
                    onRemovePhoto={() => { setPendingPhoto(null); setPhotoName(null); }}
                />
            }
        />
    );
}
