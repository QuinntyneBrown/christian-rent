/** What the line under "Review" is written from. */
export interface QueueSummary {
  readonly state: 'loading' | 'loaded' | 'empty' | 'failed';
  /** True once the wait is long enough to be told (L2-033, criterion 5). */
  readonly told: boolean;
  readonly waiting: number;
  /** How many of the waiting items the screen holds. */
  readonly held: number;
}

/** The line under "Review": how many wait and, when not all are held, how many are shown. */
export function queueSummary({ state, told, waiting, held }: QueueSummary): string {
  switch (state) {
    case 'loading':
      return told ? 'Loading the queue…' : '';
    case 'failed':
      return 'The queue didn’t load';
    case 'empty':
      return 'Nothing is waiting';
    case 'loaded': {
      const showing = waiting > held ? ` · showing ${held}` : '';
      return `${waiting} waiting · oldest first${showing}`;
    }
  }
}
