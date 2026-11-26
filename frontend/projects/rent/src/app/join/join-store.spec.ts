import { TestBed } from '@angular/core/testing';
import {
  type ApiError,
  CHURCHES_API,
  type ChurchOption,
  type ChurchesApi,
  MEMBERS_API,
  type MembersApi,
  SESSION,
  type Session,
} from '@rent/api';
import { NEW_CHURCH } from '@rent/domain';
import { JoinStore } from './join-store';

const unreachable: ApiError = {
  status: 0,
  code: null,
  retryAt: null,
  reportedAt: null,
  fields: null,
};
const grace: ChurchOption = { id: 'grace', name: 'Grace Community Church', city: 'Langley' };
const sarah = {
  id: 'm1',
  name: 'Sarah Kim',
  churchName: 'Grace Community Church',
  isVerified: false,
  isAdmin: false,
};

interface Setup {
  list?: ChurchesApi['list'];
  join?: MembersApi['join'];
}

function setup({
  list = () => Promise.resolve([grace]),
  join = () => Promise.resolve(sarah),
}: Setup = {}) {
  const session: Session = {
    member: (() => null) as never,
    refresh: vi.fn(() => Promise.resolve()),
  };
  const joins: unknown[] = [];
  TestBed.configureTestingModule({
    providers: [
      JoinStore,
      { provide: CHURCHES_API, useValue: { list } },
      {
        provide: MEMBERS_API,
        useValue: {
          me: vi.fn(),
          join: (request: unknown) => {
            joins.push(request);
            return join(request as never);
          },
        },
      },
      { provide: SESSION, useValue: session },
    ],
  });
  return { store: TestBed.inject(JoinStore), session, joins };
}

function fillIn(store: JoinStore): void {
  store.set('name', 'Sarah Kim');
  store.set('church', 'grace');
  store.set('declaresChristian', true);
}

// become-member design: the join dialog's state.
describe('JoinStore', () => {
  it('loads the churches, and says when they could not be loaded', async () => {
    const answers = [Promise.reject(unreachable), Promise.resolve([grace])];
    const { store } = setup({ list: () => answers.shift()! });
    expect(store.churchesState()).toBe('loading');

    await store.loadChurches();
    expect(store.churchesState()).toBe('failed');

    await store.loadChurches();
    expect(store.churchesState()).toBe('loaded');
    expect(store.churches()).toEqual([grace]);
  });

  it('drops a request for the churches that a newer one replaced', async () => {
    const signals: AbortSignal[] = [];
    const { store } = setup({
      list: (signal) => {
        signals.push(signal);
        return Promise.resolve([grace]);
      },
    });

    void store.loadChurches();
    await store.loadChurches();

    expect(signals.map((signal) => signal.aborted)).toEqual([true, false]);
  });

  it('aborts the churches still loading when the dialog goes', () => {
    const signals: AbortSignal[] = [];
    const { store } = setup({
      list: (signal) => {
        signals.push(signal);
        return new Promise(() => undefined);
      },
    });
    void store.loadChurches();

    TestBed.resetTestingModule();

    expect(signals[0]?.aborted).toBe(true);
  });

  it('shows no error until a person tries to join, then marks each missing item', async () => {
    const { store, joins } = setup();
    expect(store.errors()).toEqual({});

    expect(await store.join()).toBe(false);

    expect(Object.keys(store.errors())).toEqual(['name', 'church', 'declaresChristian']);
    expect(joins).toEqual([]);
    expect(store.status()).toBe('idle');
  });

  it('clears an error as its field is put right', async () => {
    const { store } = setup();
    await store.join();

    store.set('name', 'Sarah Kim');

    expect(Object.keys(store.errors())).toEqual(['church', 'declaresChristian']);
  });

  it('knows when a new church is being entered', () => {
    const { store } = setup();

    store.set('church', NEW_CHURCH);

    expect(store.isNewChurch()).toBe(true);
  });

  it('joins, is busy meanwhile, and asks the session who the person is now', async () => {
    let finish!: () => void;
    const { store, session, joins } = setup({
      join: () => new Promise((resolve) => (finish = () => resolve(sarah))),
    });
    fillIn(store);

    const joined = store.join();
    expect(store.status()).toBe('busy');
    expect(await store.join()).toBe(false);
    finish();

    expect(await joined).toBe(true);
    expect(store.status()).toBe('idle');
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(joins).toEqual([
      {
        name: 'Sarah Kim',
        churchId: 'grace',
        newChurchName: null,
        newChurchCity: null,
        declaresChristian: true,
      },
    ]);
  });

  it('keeps what was entered when joining fails, and can try again', async () => {
    const answers = [Promise.reject(unreachable), Promise.resolve(sarah)];
    const { store } = setup({ join: () => answers.shift()! });
    fillIn(store);

    expect(await store.join()).toBe(false);
    expect(store.status()).toBe('failed');
    expect(store.form().name).toBe('Sarah Kim');

    expect(await store.join()).toBe(true);
  });
});
