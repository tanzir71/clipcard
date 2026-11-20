import { useEffect, useRef, useState } from 'react';
import strings from '@clipcard/i18n/en';
import {
  getDraftRetention,
  setDraftRetention,
  sweepDraftCollections,
} from '../collections.ts';
import type { Retention } from '../collections.ts';

export function CollectionBackupControls({
  refresh,
}: {
  refresh: () => Promise<unknown>;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const [retention, setRetention] = useState<Retention>('30-days');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    void getDraftRetention()
      .then((value) => {
        if (active) setRetention(value);
      })
      .catch(() => {
        if (active) setStatus(strings['card.savedFailed']);
      });
    return () => {
      active = false;
    };
  }, []);

  async function backup(input?: File) {
    setBusy(true);
    setStatus('');
    try {
      const { exportCollections, importCollections } =
        await import('../collection-archive.ts');
      if (input) {
        await importCollections(input);
        await refresh();
        setStatus(strings['drafts.imported']);
      } else {
        const url = URL.createObjectURL(await exportCollections());
        const link = document.createElement('a');
        link.href = url;
        link.download = 'clipcard-backup.zip';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
      }
    } catch {
      setStatus(strings[input ? 'drafts.importFailed' : 'drafts.exportFailed']);
    } finally {
      setBusy(false);
    }
  }

  async function setKeep(value: Retention) {
    setStatus('');
    try {
      await setDraftRetention(value);
      setRetention(value);
      await sweepDraftCollections();
      await refresh();
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }

  return (
    <div className="clip-backup-controls">
      <label>
        {strings['drafts.keep']}
        <select
          value={retention}
          onChange={(event) =>
            void setKeep(event.currentTarget.value as Retention)
          }
          disabled={busy}
        >
          <option value="30-days">{strings['drafts.30days']}</option>
          <option value="forever">{strings['drafts.forever']}</option>
        </select>
      </label>
      <button
        type="button"
        className="clip-button"
        disabled={busy}
        onClick={() => void backup()}
      >
        {strings['drafts.export']}
      </button>
      <button
        type="button"
        className="clip-button"
        disabled={busy}
        onClick={() => upload.current?.click()}
      >
        {strings['drafts.import']}
      </button>
      <input
        type="file"
        ref={upload}
        accept=".zip,application/zip"
        hidden
        onChange={(event) => {
          const input = event.currentTarget.files?.[0];
          if (input) void backup(input);
          event.currentTarget.value = '';
        }}
      />
      {status ? <span role="status">{status}</span> : null}
    </div>
  );
}
