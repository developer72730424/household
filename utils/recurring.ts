// 固定費（毎月決まった日に発生する支出）の自動登録ロジック

export interface RecurringRule {
    id: string;
    item: string;
    amount: string;
    category: string;
    day: number;            // 毎月の発生日（1〜28）
    lastGenerated: string;  // 最後に履歴へ追加した年月 "YYYY/M"
}

export interface GeneratedEntry {
    id: string;
    item: string;
    amount: string;
    category: string;
    date: string;
}

const toYM = (year: number, monthIndex: number) => {
    const d = new Date(year, monthIndex, 1);
    return `${d.getFullYear()}/${d.getMonth() + 1}`;
};

const parseYM = (ym: string) => {
    const [y, m] = ym.split('/').map(Number);
    return { year: y, monthIndex: m - 1 };
};

// 新規ルールの lastGenerated 初期値。
// 今月の発生日を既に過ぎていれば（手入力済みの可能性が高いので）来月から自動登録する
export function initialLastGenerated(day: number, today: Date = new Date()): string {
    const offset = day <= today.getDate() ? 0 : -1;
    return toYM(today.getFullYear(), today.getMonth() + offset);
}

// 前回登録以降、今日までに発生日を迎えた分の履歴を生成する（アプリを開かなかった月も遡って登録）
export function generateDueEntries(rules: RecurringRule[], today: Date = new Date()) {
    const entries: GeneratedEntry[] = [];
    const updatedRules = rules.map(rule => {
        const { year, monthIndex } = parseYM(rule.lastGenerated);
        let cursor = new Date(year, monthIndex + 1, 1);
        let last = rule.lastGenerated;
        // 発生日の 0:00 が今日以前なら登録対象
        while (new Date(cursor.getFullYear(), cursor.getMonth(), rule.day) <= today) {
            const ym = toYM(cursor.getFullYear(), cursor.getMonth());
            entries.push({
                id: `${Date.now()}_${rule.id}_${ym}`,
                item: rule.item,
                amount: rule.amount,
                category: rule.category,
                date: `${ym}/${rule.day}`,
            });
            last = ym;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        }
        return last === rule.lastGenerated ? rule : { ...rule, lastGenerated: last };
    });
    return { entries, updatedRules, changed: entries.length > 0 };
}
