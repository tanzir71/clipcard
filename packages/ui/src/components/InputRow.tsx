import { useRef, useState } from 'react';
import type { ClipboardEvent, DragEvent, FormEvent } from 'react';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { readTransfer } from '../input.ts';
import type { CardInput } from '../input.ts';
import { Icon } from './Icon.tsx';

export function InputRow({
  onInput,
  onPhoto,
  className,
}: {
  onInput: (input: CardInput) => Promise<boolean>;
  onPhoto?: (photo: File) => void;
  className?: string;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const writing = useRef(false);

  async function apply(data: CardInput) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setStatus('');
    try {
      const applied = await onInput(data);
      if (applied) setValue('');
      if (!applied) setStatus(strings['card.unsupported']);
    } catch {
      setStatus(strings['card.renderFailed']);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) void apply({ text: value });
  }

  function paste(event: ClipboardEvent) {
    const data = readTransfer(event.clipboardData);
    if (!data.text && !data.uri && !data.html && !data.file) return;
    event.preventDefault();
    event.stopPropagation();
    void apply(data);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    const data = readTransfer(event.dataTransfer);
    if (data.text || data.uri || data.html || data.file) void apply(data);
  }

  async function pasteFromClipboard() {
    const data: CardInput = {};
    try {
      if (navigator.clipboard.read) {
        for (const item of await navigator.clipboard.read()) {
          const image = item.types.find((type) => type.startsWith('image/'));
          if (image && !data.file) data.file = await item.getType(image);
          if (item.types.includes('text/html') && !data.html)
            data.html = await (await item.getType('text/html')).text();
          if (item.types.includes('text/plain') && !data.text)
            data.text = await (await item.getType('text/plain')).text();
        }
      } else {
        data.text = await navigator.clipboard.readText();
      }
      await apply(data);
    } catch {
      setStatus(strings['card.clipboardUnavailable']);
      input.current?.focus();
    }
  }

  return (
    <form
      className={'clip-input-shell ' + (className ?? '')}
      onSubmit={submit}
      onPaste={paste}
      onDragOver={(event) => event.preventDefault()}
      onDrop={drop}
      aria-busy={busy}
    >
      <div className="clip-input-row">
        <Icon name="link" />
        <input
          ref={input}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={strings['card.sourceHintShort']}
          aria-label={strings['card.sourceHint']}
        />
        {value ? (
          <button
            type="submit"
            className="clip-button clip-primary"
            disabled={busy}
          >
            {strings['card.makeCard']}
          </button>
        ) : null}
        <button
          type="button"
          className="clip-button clip-paste"
          disabled={busy}
          onClick={pasteFromClipboard}
        >
          {strings['card.paste']}
        </button>
        <button
          type="button"
          className="clip-button clip-photo-pick"
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          <Icon name="photo" />
          {strings['card.photo']}
        </button>
        <input
          ref={picker}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const photo = event.currentTarget.files?.[0];
            if (photo) {
              if (onPhoto) onPhoto(photo);
              else void apply({ file: photo });
            }
            event.currentTarget.value = '';
          }}
        />
      </div>
      {status ? (
        <p role="status" className="clip-status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
