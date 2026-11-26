/** Which page to ask for, and by which cursor (null for the first page). */
export interface PageRequest {
  readonly index: number;
  readonly cursor: string | null;
}

/** A page the window holds, with its place in the list. */
export interface WindowPage<T> {
  readonly index: number;
  readonly items: readonly T[];
}

interface Slot<T> {
  /** The cursor that requested this page. */
  readonly cursor: string | null;
  /** The cursor of the page after it, or null when it is the last. */
  next: string | null;
  items: readonly T[] | null;
  /** The height it measured when it was released. */
  height: number;
}

/**
 * A bounded buffer of pages (ADR 0013; L2-030, criterion 4). Every page seen is a slot that
 * keeps the cursor that requested it; at most `maxPages` consecutive slots hold their items.
 * When a page arrives at one end and the window is full, the page at the other end is released:
 * it keeps only its height, measured by the screen as it goes, which a spacer reserves so the
 * scroll position holds. A released page is asked for again by its cursor.
 */
export class ListingWindow<T> {
  private slots: Slot<T>[] = [];
  private first = 0;
  private last = -1;

  constructor(readonly maxPages = 3) {}

  /** The pages held, in order. */
  get pages(): WindowPage<T>[] {
    const pages: WindowPage<T>[] = [];
    for (let index = this.first; index <= this.last; index++) {
      pages.push({ index, items: this.slots[index]!.items ?? [] });
    }
    return pages;
  }

  /** Every item held, in order. */
  get items(): T[] {
    return this.pages.flatMap((page) => page.items);
  }

  /** The height released above the window. */
  get before(): number {
    return this.sum(0, this.first);
  }

  /** The height released below the window. */
  get after(): number {
    return this.sum(this.last + 1, this.slots.length);
  }

  /** True when the last page of the list is held. */
  get atEnd(): boolean {
    return (
      this.last >= 0 && this.last === this.slots.length - 1 && this.slots[this.last]!.next === null
    );
  }

  /** The page to ask for next in a direction, or null when there is none. */
  nextRequest(direction: 'up' | 'down'): PageRequest | null {
    if (direction === 'up') {
      return this.first > 0
        ? { index: this.first - 1, cursor: this.slots[this.first - 1]!.cursor }
        : null;
    }
    if (this.last < 0) {
      return { index: 0, cursor: null };
    }
    const below = this.slots[this.last + 1];
    if (below) {
      return { index: this.last + 1, cursor: below.cursor };
    }
    const next = this.slots[this.last]!.next;
    return next === null ? null : { index: this.last + 1, cursor: next };
  }

  /**
   * Takes the page a request answered. When the window is then over full, the page at the
   * other end is released with the height `measure` gives for it, before it leaves the screen.
   */
  receive(
    request: PageRequest,
    items: readonly T[],
    nextCursor: string | null,
    measure: (index: number) => number,
  ): void {
    const { index } = request;
    const below = this.last < 0 ? index === 0 : index === this.last + 1;
    const above = this.last >= 0 && index === this.first - 1;
    if (!below && !above) {
      return;
    }
    if (index === this.slots.length) {
      this.slots.push({ cursor: request.cursor, next: nextCursor, items, height: 0 });
    } else {
      const slot = this.slots[index]!;
      slot.items = items;
      slot.next = nextCursor;
    }

    if (below) {
      this.last = index;
      if (this.last - this.first + 1 > this.maxPages) {
        this.release(this.first, measure);
        this.first++;
      }
    } else {
      this.first = index;
      if (this.last - this.first + 1 > this.maxPages) {
        this.release(this.last, measure);
        this.last--;
      }
    }
  }

  /**
   * Drops the held items that match, such as an item an admin decided (ADR 0025). A page keeps
   * its cursors, so the pages after it are asked for as before.
   */
  drop(match: (item: T) => boolean): void {
    for (let index = this.first; index <= this.last; index++) {
      const slot = this.slots[index]!;
      if (slot.items !== null) {
        slot.items = slot.items.filter((item) => !match(item));
      }
    }
  }

  /** Forgets every page, as before the first request. */
  clear(): void {
    this.slots = [];
    this.first = 0;
    this.last = -1;
  }

  private release(index: number, measure: (index: number) => number): void {
    const slot = this.slots[index]!;
    slot.height = measure(index);
    slot.items = null;
  }

  private sum(from: number, to: number): number {
    let total = 0;
    for (let index = from; index < to; index++) {
      total += this.slots[index]!.height;
    }
    return total;
  }
}
