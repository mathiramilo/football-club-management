const webmailByDomain: Record<string, string> = {
  'gmail.com': 'https://mail.google.com/',
  'googlemail.com': 'https://mail.google.com/',
  'hotmail.com': 'https://outlook.live.com/mail/',
  'outlook.com': 'https://outlook.live.com/mail/',
  'live.com': 'https://outlook.live.com/mail/',
  'yahoo.com': 'https://mail.yahoo.com/',
  'yahoo.com.ar': 'https://mail.yahoo.com/',
  'icloud.com': 'https://www.icloud.com/mail/',
  'me.com': 'https://www.icloud.com/mail/',
};

export const webmailFor = (email: string) => webmailByDomain[email.split('@')[1] ?? ''];
