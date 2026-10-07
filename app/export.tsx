import React from 'react';

import Export from '@/components/screens/Export';
import { useAppData } from '@/context/app-data';
import { useGoBack } from '@/hooks/use-go-back';

export default function ExportRoute() {
    const { entries, categories, lastBackupAt, getSnapshot, resetEntries, restoreBackup, markBackedUp } = useAppData();
    return (
        <Export
            entries={entries}
            categories={categories}
            lastBackupAt={lastBackupAt}
            getSnapshot={getSnapshot}
            onBack={useGoBack()}
            onResetData={resetEntries}
            onRestore={restoreBackup}
            onBackedUp={markBackedUp}
        />
    );
}
