import { browser } from 'wxt/browser';

export function SettingsBrand({ name }: { name: string }) {
  return (
    <div className="settings-brand">
      <img
        src={browser.runtime.getURL('/icon/48.png')}
        width="24"
        height="24"
        alt=""
      />
      <span>{name}</span>
    </div>
  );
}
