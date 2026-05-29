'use client';

import ErrorFallback from '@/components/common/ErrorFallback';

export default function QueueError({ error, reset }) {
  return <ErrorFallback reset={reset} title="The queue board hit an error" description={error?.message} />;
}
