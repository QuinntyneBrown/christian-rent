# christian.rent design system

Extracted from [docs/mocks](../mocks/README.md) on Nov 26, 2026. Open [index.html](index.html) from disk to browse it.

The mocks are the source of truth for the UI; this system is what they have in common, written down once. The mocks link `tokens/tokens.css` and `assets/components.css` from here, so the two cannot drift apart.

christian.rent is two applications of a few screens, and narrow on purpose. The system documents the components those screens use and no others: it has no table, tabs, menu, tooltip, breadcrumb, pagination or switch, because no screen has one. Add a component here when a mock first needs it.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Ramps, roles, both themes and every checked contrast pair. |
| [Typography](foundations/typography.html) | The two families, the roles and the rules. |
| [Spacing](foundations/spacing.html) | The 4 px scale and where each step goes. |
| [Layout](foundations/layout.html) | Breakpoints, the grid and each screen’s template. |
| [Elevation](foundations/elevation.html) | Four shadows and the layers. |
| [Shape](foundations/shape.html) | Radii and border widths. |
| [Motion](foundations/motion.html) | Durations, easings and reduced motion. |
| [Iconography](foundations/iconography.html) | The icon set and how to label it. |
| [Theming](foundations/theming.html) | Token tiers, light and dark, tokens.json. |
| [Responsive](foundations/responsive.html) | What each component does at each width. |
| [Accessibility](foundations/accessibility.html) | The WCAG 2.2 AA commitments and the component contract. |
| [Content](foundations/content.html) | The words, the formats and the formulas. |

## Components

| Component | Group | What it is |
|---|---|---|
| [Button](components/button.html) | Actions | A button does something: it posts, sends, approves, removes. Its colour says what kind of thing it does. |
| [Link](components/link.html) | Actions | A link goes somewhere and changes nothing. |
| [Text field](components/text-field.html) | Inputs | One line of text in a bordered box: a name, a church, a city. |
| [Textarea](components/textarea.html) | Inputs | Several lines of a member’s own words: a message, a listing’s note, a report’s note. |
| [Select](components/select.html) | Inputs | One choice from a list that is too long to lay out: a member’s church, the period a price is per. |
| [Checkbox](components/checkbox.html) | Inputs | One thing a person agrees to: the declaration that they are a Christian. |
| [Radio group](components/radio-group.html) | Inputs | One choice from a short fixed list: the reason for a report. |
| [Date range](components/date-range.html) | Inputs | A start and an end date, sent with a message about a listing for rent or given as a listing’s “when”. |
| [Form field](components/form-field.html) | Inputs | The wrapper every input sits in: its label, then the control, then help, an error or a counter. |
| [Line field](components/line-field.html) | Inputs | Post’s big field: a question, and an answer written large on a single line. |
| [Word toggle](components/word-toggle.html) | Inputs | The highlighted words in Post’s sentence: “have” or “need”, “a space” or “a thing”. |
| [Photo picker](components/photo-picker.html) | Inputs | Adds up to six photos to a listing for rent, and shows which one goes on the card. |
| [Search bar](components/search-bar.html) | Inputs | Browse’s search: what you are looking for, where, and Search. |
| [Switch (Everything, For rent, Wanted)](components/segmented.html) | Navigation | Browse’s switch between everything, what is for rent and what is wanted. |
| [Kind filter](components/kind-filter.html) | Inputs | Narrows Browse to spaces or to things. |
| [Logo](components/logo.html) | Brand | The mark, a key whose head is a cross, and the lowercase wordmark with “.rent” in orange. |
| [Site header](components/site-header.html) | Navigation | The bar at the top of Browse, Listing and Sign in: the logo, who is signed in with Sign out, or Sign in, and Post. |
| [Admin navigation](components/admin-nav.html) | Navigation | The ink rail in Admin: the logo, who the admin is, the review queue with its count, the way back to the site, and Sign out. |
| [Sign in](components/sign-in.html) | Forms | The sign-in form of either application: email, password, Sign in, and who creates accounts. |
| [Admin gate](components/admin-gate.html) | Layout | Admin's ink page around one card: its sign-in and its forbidden page. |
| [Skip link](components/skip-link.html) | Navigation | The first thing the Tab key reaches: a link past the header to the content. |
| [Dialog](components/dialog.html) | Containers and overlays | A short task over the page: report a listing, confirm Remove, become a member. |
| [Listing card](components/listing-card.html) | Data display | One listing on Browse: a photo for something for rent, a blue card with no photo for something wanted. |
| [Message box](components/message-box.html) | Containers and overlays | The panel beside a listing that sends a message to the person who posted it. |
| [Photo gallery](components/gallery.html) | Data display | A listing’s photos: one large, the rest as thumbnails to step through. |
| [Wanted panel](components/wanted-panel.html) | Data display | The head of a wanted listing: where a photo would be, the request itself in white on blue. |
| [Posted by](components/poster.html) | Data display | Who posted a listing and the church they belong to, each marked Verified when an admin has confirmed it. |
| [Queue item](components/queue-item.html) | Data display | One thing waiting in Admin’s review queue: a new listing, a report or a new member. |
| [Review detail](components/review-detail.html) | Containers and overlays | Admin’s detail panel: everything needed to decide on one item, and the buttons that decide. |
| [Avatar](components/avatar.html) | Data display | A member’s initials on a pale tile. |
| [Tag](components/tag.html) | Data display | A short label: what kind of listing, or what kind of item in the queue. |
| [Verified mark](components/verified.html) | Data display | An icon and the word “Verified” beside a member or a church an admin has confirmed. |
| [Toast](components/toast.html) | Feedback | A short message that rises from the corner of Admin after a decision. |
| [Alert](components/alert.html) | Feedback | A message inside the page, at the place it is about. |
| [Skeleton](components/skeleton.html) | Feedback | A grey shape where content is about to be. |
| [Spinner](components/spinner.html) | Feedback | A small turning ring for a wait that has no shape. |
| [Empty and error states](components/empty-state.html) | Feedback | What a screen shows when there is nothing to show: nothing yet, nothing found, nothing loaded, not found, not allowed. |
| [Confirmation](components/confirmation.html) | Feedback | What replaces a form once it has done its job: a tick, what happened, what happens next. |
| [Browse headline](components/hero.html) | Containers and overlays | The top of Browse: what christian.rent is, and the two buttons that lead straight to posting. |
| [Layout primitives](components/layout.html) | Containers and overlays | The container, the stack and the cluster that every screen is laid out with. |

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | How a member fills something in on christian.rent, and what happens when it goes wrong. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Which kind of feedback answers which action, and how waiting looks. |
| [Empty and error states](patterns/empty-and-error-states.html) | What to show when there is nothing to show, and how to word it. |
| [Navigation and page structure](patterns/navigation-and-page-structure.html) | How the screens of the two applications are put together and how a person moves between them. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | When something opens over the page, and how it behaves. |
| [Lists of listings and the queue](patterns/lists.html) | How Browse’s grid and Admin’s queue load, grow and stay bounded. |
| [Notifications](patterns/notifications.html) | How christian.rent tells someone that something happened. |
| [Content and tone](patterns/content-and-tone.html) | How christian.rent sounds: plain, warm, Canadian, and true. |

## Tokens

- `tokens/tokens.css` is the source of truth: primitives, semantic tokens, the light and dark themes.
- `tokens/tokens.json` is the DTCG export, generated from the CSS. Do not edit it by hand.
- `tokens/contrast-pairs.json` lists every foreground and background pairing the components rely on; all are checked in both themes.
- `assets/components.css` is the component stylesheet. It contains no colour, and no size or duration that a token covers.
- `assets/fonts/` holds Bricolage Grotesque and Instrument Sans (SIL Open Font License), self-hosted.
- `assets/ds.css` and `assets/ds.js` are the chrome of these pages, not product code.

## Drift found in the mocks

Values the first draft of the mocks carried that did not fit the system, and what was done. The mocks were regenerated on the corrected tokens.

| Where | Issue | Resolution |
|---|---|---|
| Listing photo, wanted panel | A sixth radius, 32 px, used twice | Snapped to `--radius-xl` (28 px); five radii and the pill remain |
| Search bar, message box | A fifth shadow, `--shadow-float` | Became `--shadow-2`; four levels and the focus ring remain |
| Browse headline on a phone | `font-size: 2.6rem`, off the scale | `--font-size-4xl` (36 px) |
| Post sentence on a phone | `font-size: 2.1rem`, `line-height: 1.3` and `1.25` | `--text-h1` with `--line-height-snug` |
| Wordmark | `letter-spacing: -0.03em`, `line-height: 1` | `--letter-spacing-tight`, `--line-height-display` |
| Listing card title | `letter-spacing: -0.01em` | Removed |
| Brand sheet wordmark | `4.5rem` and `6rem` | `--font-size-6xl` |
| Wanted buttons, dark theme | Hover fill `sky-400` gave white text 2.9:1 | Hover uses `sky-700` in both themes |
| Kit | 99 classes from the starter kit that no mock uses (tables, tabs, menus, tooltips, drawers and others) | Pruned from `components.css` |
| Mocks | Tokens and component CSS lived in `docs/mocks/assets/` | Moved here; the mocks link them. `docs/mocks/assets/tokens.css` remains as a one-line import for the generated gallery |

Corrections made earlier, when the prototype was transcribed into the mocks (orange text contrast, the Approve green, input edges, 44 px targets), are in [the mocks README](../mocks/README.md).

Known and left: component dimensions that are not on a scale by nature (the 34 px mark, 128 × 96 px photo tiles, 72 × 54 px thumbnails) stay as rem values in `components.css`.

## Verification

Run on Nov 26, 2026, from the repository root.

| Check | Command | Result |
|---|---|---|
| Structure | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 59 pages (38 components, 8 patterns), 0 errors, 0 warnings |
| Contrast | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 134 passed, 0 failed, 0 unresolved (67 pairs in each of the light and dark themes) |
| Token export | `python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css` | 305 tokens written to `tokens/tokens.json` |
| Mocks on the system | `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 10 screens, 66 mocks, 0 errors, 0 warnings |
| Token coverage | Every token in `:root` appears in the Tokens table of exactly one foundation page | 0 missing, 0 duplicated |
| Rendering | Every page loaded in Chromium at 360 and 1280 px | No page scrolls sideways, no script error, and every live contrast ratio on every page passes in both themes |
| Looked at | Screenshots of the index, Button, Listing card, Word toggle, Message box, Dialog, Color and the Forms pattern, at 360 and 1280 px, light and dark | Reviewed; overflowing specimens and overlapping theme examples were fixed |

Not run: the full screenshot sweep of all 59 pages in both themes, and any check with a screen reader.
