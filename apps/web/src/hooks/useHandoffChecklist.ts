import { useEffect, useMemo, useState } from 'react';
import type { ChecklistSection } from '../lib/handoff-checklist';

export function useHandoffChecklist(sections: ChecklistSection[]) {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [markedComplete, setMarkedComplete] = useState(false);

  const itemKeys = useMemo(
    () =>
      sections.flatMap((section, sectionIndex) => section.items.map((_, itemIndex) => `${sectionIndex}-${itemIndex}`)),
    [sections],
  );

  const checkedCount = useMemo(() => itemKeys.filter((key) => checks[key]).length, [checks, itemKeys]);
  const totalItems = itemKeys.length;
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  useEffect(() => {
    if (markedComplete && checkedCount !== totalItems) {
      setMarkedComplete(false);
    }
  }, [checkedCount, markedComplete, totalItems]);

  const toggleCheck = (key: string) => {
    setChecks((previousChecks) => ({
      ...previousChecks,
      [key]: !previousChecks[key],
    }));
  };

  const markComplete = () => {
    if (checkedCount === totalItems) {
      setMarkedComplete(true);
    }
  };

  return {
    checks,
    markedComplete,
    checkedCount,
    totalItems,
    progressPercent,
    toggleCheck,
    markComplete,
  };
}
