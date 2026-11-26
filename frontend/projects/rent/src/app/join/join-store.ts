import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { CHURCHES_API, type ChurchOption, MEMBERS_API, SESSION } from '@rent/api';
import {
  type JoinField,
  type JoinForm,
  type JoinFormErrors,
  NEW_CHURCH,
  toJoinRequest,
  validateJoinForm,
} from '@rent/domain';

/** Whether the churches to pick from have arrived (L2-017, criteria 8 and 13). */
export type ChurchesState = 'loading' | 'loaded' | 'failed';

/** Whether joining is waiting, in flight, or failed (L2-017, criterion 11). */
export type JoinStatus = 'idle' | 'busy' | 'failed';

const EMPTY: JoinForm = {
  name: '',
  church: '',
  newChurchName: '',
  newChurchCity: '',
  declaresChristian: false,
};

/**
 * The join dialog's state (become-member design): what was entered, the churches, and joining.
 * Provided by the dialog, so it goes when the dialog closes, and the churches' request with it.
 * Errors show once a person has tried to join, and each clears as its field is put right.
 */
@Injectable()
export class JoinStore {
  private readonly churchesApi = inject(CHURCHES_API);
  private readonly membersApi = inject(MEMBERS_API);
  private readonly session = inject(SESSION);
  private churchesRequest: AbortController | null = null;

  private readonly entered = signal<JoinForm>(EMPTY);
  private readonly tried = signal(false);

  readonly form = this.entered.asReadonly();
  readonly churches = signal<readonly ChurchOption[]>([]);
  readonly churchesState = signal<ChurchesState>('loading');
  readonly status = signal<JoinStatus>('idle');
  readonly isNewChurch = computed(() => this.entered().church === NEW_CHURCH);
  readonly errors = computed<JoinFormErrors>(() =>
    this.tried() ? validateJoinForm(this.entered()) : {},
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.churchesRequest?.abort());
  }

  set<F extends JoinField>(field: F, value: JoinForm[F]): void {
    this.entered.update((form) => ({ ...form, [field]: value }));
  }

  /** Asks for the churches, again after a failure; a request still in flight is dropped. */
  async loadChurches(): Promise<void> {
    this.churchesRequest?.abort();
    const request = new AbortController();
    this.churchesRequest = request;
    this.churchesState.set('loading');
    try {
      this.churches.set(await this.churchesApi.list(request.signal));
      this.churchesState.set('loaded');
    } catch {
      if (!request.signal.aborted) {
        this.churchesState.set('failed');
      }
    }
  }

  /**
   * Joins with what was entered. Answers true once the person is a member; false when a field
   * is invalid (each is then marked) or joining failed (what was entered is kept).
   */
  async join(): Promise<boolean> {
    if (this.status() === 'busy') {
      return false;
    }
    this.tried.set(true);
    if (Object.keys(this.errors()).length > 0) {
      return false;
    }
    this.status.set('busy');
    try {
      await this.membersApi.join(toJoinRequest(this.entered()));
      await this.session.refresh();
      this.status.set('idle');
      return true;
    } catch {
      this.status.set('failed');
      return false;
    }
  }
}
