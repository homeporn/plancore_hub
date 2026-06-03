'use client';

import { useRouter } from 'next/navigation';
import type { ScheduleRow } from '@plancore/core';
import { ScheduleWizard } from '@/components/wizard/ScheduleWizard';
import { setScheduleHandoff } from '@/lib/scheduleHandoff';

export default function WizardPage() {
  const router = useRouter();

  function handleCreate(rows: ScheduleRow[]) {
    setScheduleHandoff(rows);
    router.push('/editor');
  }

  return <ScheduleWizard onCreate={handleCreate} />;
}
