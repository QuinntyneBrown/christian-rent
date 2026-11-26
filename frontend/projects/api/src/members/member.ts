/** A member as the backend answers `GET /api/members/me` and `POST /api/members` (become-member design). */
export interface Member {
  readonly id: string;
  readonly name: string;
  /** The member's church, which Post's preview shows (ADR 0019). */
  readonly churchName: string;
  readonly isVerified: boolean;
  readonly isAdmin: boolean;
}

/**
 * What a person sends to join (L2-017, criteria 1 and 2): their name, an existing church or a
 * new one with its city, and the declaration.
 */
export interface JoinRequest {
  readonly name: string;
  readonly churchId: string | null;
  readonly newChurchName: string | null;
  readonly newChurchCity: string | null;
  readonly declaresChristian: boolean;
}

/** A church to pick when joining, shown as "{name}, {city}" (L2-017, criterion 8). */
export interface ChurchOption {
  readonly id: string;
  readonly name: string;
  readonly city: string;
}
