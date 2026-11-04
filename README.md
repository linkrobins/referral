# Link Robins Referral

An invite code referral system for [Flarum](https://flarum.org/) 2.0. Each member gets a unique personal invite code they can share with others. New users enter the code during registration to be credited to the referrer. Admins can optionally require a code to register at all.

---

## Features

- **Personal invite codes.** Each eligible member gets a unique 8-character code. Codes skip look-alike characters (no 0/O or 1/I), and entering one is not case-sensitive.
- **Eligibility rules.** Choose who gets a personal code: allowed groups, a minimum post count, a minimum account age in days, and a whitelist of usernames. When several rules are set, a member must meet all of them. Admins and whitelisted usernames always qualify. Members who do not qualify yet see a short "check back later" note instead of a code.
- **Three ways to share.** The code itself, a referral link (`?ref=CODE`) that pre-fills it, or a QR code shown on screen and downloadable as a print-ready PNG.
- **Invite code at sign-up.** The Sign Up form has an Invite Code field, optional by default. Arriving through a referral link or QR code fills it in automatically (the link is remembered for 10 minutes, so it survives the step into the sign-up form).
- **Require a code (invite-only).** One admin switch makes a valid code mandatory for every new registration. Expired or unknown codes are always refused with a clear message, whether or not codes are required.
- **Referral counts.** Each member's count shows on the Referrals tab, on their profile card, and in the profile navigation.
- **Notification to the referrer.** When someone registers with a member's code, the referrer gets a forum alert and an email. Both are on by default and each can be turned off in the member's notification settings.
- **Campaign codes.** Standalone codes that belong to no member, for social media or promotions. Each has a label, an optional expiry date, a use counter, and its own QR code. They count uses but credit no referrer. Admins create and delete them from the extension's settings page; deleting one stops it from working.
- **Fair counting.** Using your own code does not count, and a person is only ever credited to one referrer.
- **Private by design.** A member's code and the list of who they referred are visible only to that member and to admins.
- **Translatable.** All text lives in a locale file.

## Screenshots

**Referrals profile tab**: shows the member's invite code and total referral count.
<img width="1390" height="922" alt="image" src="https://github.com/user-attachments/assets/4890871b-a5be-4208-adc2-602f5611e8ad" />

**Sign-up modal**: includes an optional (or required) Invite Code field.
<img width="646" height="949" alt="image" src="https://github.com/user-attachments/assets/d9fb52c6-6ffd-4163-8c1a-82dbd8962de5" />

**Admin settings**: toggle to require an invite code to register.
<img width="797" height="678" alt="image" src="https://github.com/user-attachments/assets/47d6cc2c-f816-42b6-8b09-81e64db2bf64" />

---

## Requirements

- Flarum 2.0 or later
- PHP 8.3 or later

---

## Installation

Install with Composer:

```
composer require linkrobins/referral
```

Then toggle it on in the admin panel's Extensions page.

### Updating

```
composer update linkrobins/referral
php flarum migrate
php flarum cache:clear
```

---

## Usage

### For Members

1. Go to your profile and click the **Referrals** tab
2. Your personal invite code is displayed, with buttons to copy it, copy a referral link, or show a QR code (with a PNG download for print)
3. When someone registers using your code, you receive a notification and your referral count increases

### For New Users

1. Click **Sign Up**
2. Fill in your username, email, and password as normal
3. Enter the invite code you received in the **Invite Code** field
4. Complete registration

### For Admins

Go to **Admin → Extensions → Link Robins Referral**. The page has three sections:

1. **General.** Toggle **Require invite code to register** for invite-only registration.
2. **Personal invite code eligibility.** Allowed groups (none checked means every group), minimum posts, minimum account age in days, and a whitelist of usernames separated by commas, spaces, or new lines. A rule left empty or at 0 is skipped.
3. **Campaign codes.** Enter an optional label and expiry date and create a code. The table shows each code with its label, uses, and expiry; use **Show QR code** to download its QR image, or **Delete** to retire it.

---

## Translations

The extension ships with English (`locale/en.yml`). To add a translation:

1. Create a new file in the `locale/` directory named after the [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes), e.g.:
   - `ko.yml`: Korean
   - `zh.yml`: Simplified Chinese
   - `es.yml`: Spanish

2. Copy the contents of `en.yml` and translate the values

3. No code changes needed; Flarum picks up locale files automatically

The English file lists every string, grouped under `forum`, `admin`, `email`, and `validation`.

---

## Database

The extension creates two tables and one column:

- `referral_invite_codes`: every invite code (personal and campaign), with its use count, label, and expiry
- `referral_invited_user`: records which user referred which
- `referral_count` on `users`: a cached count so profile cards stay fast

They are created by the migrations and removed again if you uninstall the extension and purge its data.

---

## Links

- [Packagist](https://packagist.org/packages/linkrobins/referral)
- [GitHub](https://github.com/linkrobins/referral)
- [Link Robins](https://linkrobins.com)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
