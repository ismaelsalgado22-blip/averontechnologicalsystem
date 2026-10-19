<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep PDF layout primitives pagination-aware so all generated document types reserve header and footer space.
- Shared dialog, confirmation, and sheet primitives must constrain height to the dynamic viewport and allow vertical scrolling; keep form sections and navigation chrome from shrinking so actions remain reachable on short screens.
- Store unregistered-contact appointments in guest_appointments and merge them with appointments in scheduling, dashboard and alerts; this preserves the required client foreign key without creating fictitious clients. Carry the source table through status and delete actions.
