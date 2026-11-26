import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  Injector,
} from '@angular/core';
import { DIALOG_DATA, type Dialog, DialogRef } from '@angular/cdk/dialog';
import { CHURCHES_API, HttpChurchesApi } from '@rent/api';
import {
  Alert,
  Button,
  Checkbox,
  Dialog as DialogPanel,
  FieldRow,
  Select,
  type SelectOption,
  TextField,
} from '@rent/components';
import { JOIN_LIMITS, type JoinField, NEW_CHURCH } from '@rent/domain';
import type { MemberPurpose } from '../members/member-gate';
import { JoinStore } from './join-store';

/** What `MemberGate` opens the dialog with. */
export interface JoinDialogData {
  readonly purpose: MemberPurpose;
}

const TITLES: Record<MemberPurpose, string> = {
  post: 'Become a member to post',
  message: 'Become a member to send a message',
  report: 'Become a member to report',
};

/**
 * Opens the dialog as `MemberGate` asks (L2-032, criterion 9): labelled by its title, focus on
 * the name, held inside, and returned to the control that asked when it closes. `cr-dialog`
 * draws its own backdrop and covers the viewport, so the CDK draws none. It closes with true
 * once the person is a member.
 */
export function openJoinDialog(
  dialogs: Dialog,
  purpose: MemberPurpose,
): DialogRef<boolean, JoinDialog> {
  return dialogs.open<boolean, JoinDialogData, JoinDialog>(JoinDialog, {
    data: { purpose },
    ariaLabelledBy: 'join-title',
    ariaDescribedBy: 'join-description',
    autoFocus: '#join-name',
    restoreFocus: true,
    hasBackdrop: false,
  });
}

/** The order fields are visited in when the first invalid one takes focus. */
const FIELD_IDS: Record<JoinField, string> = {
  name: 'join-name',
  church: 'join-church',
  newChurchName: 'join-church-name',
  newChurchCity: 'join-church-city',
  declaresChristian: 'join-declaration',
};

/**
 * "Become a member" (become-member design; L2-017; docs/mocks/dialogs/join/): the name, the
 * church or a new one, and the declaration. Its states are default, new-church, invalid, busy,
 * failed and churches-failed. "Not now" closes it and changes nothing. Its code, and the
 * churches' client it provides, load only when `MemberGate` opens it.
 */
@Component({
  selector: 'cr-join-dialog',
  imports: [Alert, Button, Checkbox, DialogPanel, FieldRow, Select, TextField],
  providers: [JoinStore, { provide: CHURCHES_API, useClass: HttpChurchesApi }],
  templateUrl: './join-dialog.html',
  styleUrl: './join-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinDialog {
  protected readonly store = inject(JoinStore);
  protected readonly limits = JOIN_LIMITS;
  protected readonly title = TITLES[inject<JoinDialogData>(DIALOG_DATA).purpose];
  protected readonly busy = computed(() => this.store.status() === 'busy');
  protected readonly churchOptions = computed<SelectOption[]>(() => [
    ...this.store
      .churches()
      .map((church) => ({ value: church.id, label: `${church.name}, ${church.city}` })),
    { value: NEW_CHURCH, label: 'My church isn’t listed' },
  ]);

  private readonly dialogRef = inject<DialogRef<boolean>>(DialogRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  constructor() {
    void this.store.loadChurches();
    // Escape and Close do nothing while joining is in flight (L2-017, criterion 11).
    effect(() => {
      this.dialogRef.disableClose = this.busy();
    });
  }

  protected notNow(): void {
    if (!this.busy()) {
      this.dialogRef.close(false);
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (await this.store.join()) {
      this.dialogRef.close(true);
      return;
    }
    const invalid = (Object.keys(FIELD_IDS) as JoinField[]).find(
      (field) => this.store.errors()[field],
    );
    if (invalid) {
      // Each missing item is marked; focus goes to the first, once it is drawn (criterion 10).
      afterNextRender(
        () => this.host.querySelector<HTMLElement>(`#${FIELD_IDS[invalid]}`)?.focus(),
        {
          injector: this.injector,
        },
      );
    }
  }
}
