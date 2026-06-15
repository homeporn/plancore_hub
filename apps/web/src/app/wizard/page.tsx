'use client';

import { useRouter } from 'next/navigation';
import type { ScheduleRow } from '@plancore/core';
import { ScheduleWizard } from '@/components/wizard/ScheduleWizard';
import { setScheduleHandoff, setPendingMode } from '@/lib/scheduleHandoff';
import { scenarioToMode } from '@/components/editor/planningModes';

export default function WizardPage() {
  const router = useRouter();

  function handleCreate(rows: ScheduleRow[], scenarioId: string | null) {
    setScheduleHandoff(rows);
    if (scenarioId) setPendingMode(scenarioToMode(scenarioId));
    router.push('/editor');
  }

  return <ScheduleWizard onCreate={handleCreate} />;
}
