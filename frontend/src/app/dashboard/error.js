'use client';

import ErrorFallback from '@/components/common/ErrorFallback';

export default function DashboardError({ error, reset }) {
  return <ErrorFallback reset={reset} title="The dashboard hit an error" description={error?.message} />;
}
