import { useState } from 'react';
import { interfaceStrings as strings } from '@clipcard/i18n';

export function DraftNameForm({
  title,
  save,
  className,
}: {
  title: string;
  save: (title: string) => Promise<unknown>;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <form
      className={className ?? 'clip-draft-name'}
      onSubmit={(event) => {
        event.preventDefault();
        const title = String(
          new FormData(event.currentTarget).get('title') ?? '',
        );
        setBusy(true);
        setFailed(false);
        void save(title)
          .catch(() => setFailed(true))
          .finally(() => setBusy(false));
      }}
    >
      <label>
        {strings['grid.draftName']}
        <input name="title" defaultValue={title} required />
      </label>
      <button
        type="submit"
        className="clip-button clip-primary"
        disabled={busy}
      >
        {strings['action.save']}
      </button>
      {failed ? <p role="status">{strings['card.savedFailed']}</p> : null}
    </form>
  );
}
