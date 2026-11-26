/** Who a member is, as the screens need it (become-member design). */
export interface MemberSummary {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly isAdmin: boolean;
  readonly isVerified: boolean;
}
