# Vibe Annotations

Vocabulary for visual annotations, their website scope, and the review experience.

## Language

### Website scope

**Current site**:
The website open in the browser tab hosting the annotation toolbar. Selecting a different site in the annotation list does not change the current site.

**Selected site**:
The website selected for review in View all, which can differ from the current site and can have no annotations. It defines the scope of the list and its site-level actions, not the separate global deletion action.
_Avoid_: Current site when referring to a different website selected for review.

**Current page**:
The page open in the browser tab hosting the annotation toolbar, identified by its full URL, including query and fragment when present. It belongs to the current site, not necessarily the selected site.

### Annotations and their representations

**Annotation**:
A feedback record associated with a page, containing an instruction, design changes, image attachments, or a request for Variants. The record is distinct from its visible annotation pin or annotation card.

**Annotation pin**:
The on-page marker associated with an annotation's target element. Not every annotation has a visible pin.
_Avoid_: Annotation count; unqualified badge when it could mean the toolbar counter.

**Annotation card**:
The representation of one annotation in the View all list. A card and a pin can represent the same annotation; they are not separate feedback records.

**Design preview**:
The temporary appearance of the current page reflecting annotation design changes. It is distinct from generated or edited project code.

**Attachment thumbnail**:
The compact representation of an image attached to an annotation or awaiting attachment to an unsaved annotation. It is distinct from the image itself and from an annotation pin.

**Alignment matrix**:
The nine-position Design control for choosing the alignment of an element's contents. Its choices are interpreted relative to the selected layout direction.

### Review scope and continuity

**View all**:
The annotation review panel, with a selected-site list and a separate global deletion action. Its toolbar counter represents the global annotation count, not necessarily the number of cards currently displayed.

**All filter**:
The View all filter covering all pages of the selected site, excluding resolved annotations.
_Avoid_: All sites; global list.

**This page filter**:
The View all filter covering annotations on the current page within the selected site, excluding resolved annotations. When the selected site differs from the current site, this filter has no matching annotations.

**View all session**:
One continuous period of reviewing an open View all panel, from opening until closing. Site selection, filter changes, and data refreshes belong to the same session; a later reopening is a new session.
_Avoid_: Browser session; Annotate session.

**Review position**:
The reader's place within a selected-site/filter combination during a View all session, expressed by the list's scroll position and the currently focused review control.

**Global annotation count**:
The number of locally stored, unresolved annotations across all sites, including Variants awaiting agent action. This is the counter on the View all toolbar button, independent of the selected site and active filter.
_Avoid_: Current-page count; selected-site count; unread count.

**Selected-site deletion**:
Deletion of the selected site's unresolved annotations across its pages, independent of the active All or This page filter. Ordinary Variants deletion can leave metadata awaiting agent cleanup.
_Avoid_: Global deletion; unqualified delete all.

**Global deletion**:
The separately confirmed deletion of a set of annotations spanning all sites, including resolved annotations and scaffolded Variants metadata. It removes the confirmed annotation records and their attachments, not generated project code or annotations added after confirmation was prepared.
_Avoid_: Selected-site deletion; Variants finalization; generated-code cleanup.
