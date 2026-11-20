import strings from '@clipcard/i18n/en';

export function shareIntents(headline: string, source: string | null) {
  const caption = encodeURIComponent(
    source ? headline + '\n' + source : headline,
  );
  return [
    {
      label: strings['destination.facebook'],
      address: 'https://www.facebook.com/',
    },
    {
      label: strings['destination.whatsapp'],
      address: 'https://web.whatsapp.com/',
    },
    {
      label: strings['destination.x'],
      address: 'https://x.com/intent/post?text=' + caption,
    },
    {
      label: strings['destination.linkedin'],
      address:
        'https://www.linkedin.com/feed/?shareActive=true&text=' + caption,
    },
    {
      label: strings['destination.threads'],
      address: 'https://www.threads.net/intent/post?text=' + caption,
    },
  ];
}
