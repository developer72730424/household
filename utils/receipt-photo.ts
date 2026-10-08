// レシート写真のファイル名の決め方・検査（ファイル操作そのものは receipt-files.ts）。

// 記録のIDから安全なファイル名を作る（英数字と - _ . のみ）
export function receiptFileName(entryId: string, ext: string = 'jpg'): string {
    const safeId = entryId.replace(/[^\w-]/g, '').slice(0, 60) || 'receipt';
    const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 5) || 'jpg';
    return `${safeId}.${safeExt}`;
}

export const isValidReceiptFileName = (name: string): boolean => /^[\w.-]+$/.test(name) && !name.startsWith('.');

// どの記録からも参照されていない写真（削除できるもの）
export function orphanReceipts(filesOnDisk: string[], referenced: (string | undefined)[]): string[] {
    const used = new Set(referenced.filter((x): x is string => !!x));
    return filesOnDisk.filter(f => !used.has(f));
}
