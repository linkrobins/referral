# Link Robins Referral

An invite code referral system for [Flarum](https://flarum.org/) 2.0. Each member gets a unique personal invite code they can share with others. New users enter the code during registration to be credited to the referrer. Admins can optionally require a code to register at all.

---

## Features

- Every member automatically gets a unique 8-character invite code
- Members share their code with anyone they want to invite
- New users enter the code during sign-up — no URL tricks, no extra steps
- Referral count badge appears on the member's profile nav tab and profile card
- Referrer receives a notification when someone registers with their code
- Admin setting to require an invite code for all new registrations
- Fully translatable via locale files

## Screenshots

**Referrals profile tab** — shows the member's invite code and total referral count.
<img width="1390" height="922" alt="image" src="https://github.com/user-attachments/assets/4890871b-a5be-4208-adc2-602f5611e8ad" />

**Sign-up modal** — includes an optional (or required) Invite Code field.
<img width="646" height="949" alt="image" src="https://github.com/user-attachments/assets/d9fb52c6-6ffd-4163-8c1a-82dbd8962de5" />

**Admin settings** — toggle to require an invite code to register.
<img width="797" height="678" alt="image" src="https://github.com/user-attachments/assets/47d6cc2c-f816-42b6-8b09-81e64db2bf64" />

---

## Requirements

- Flarum 2.0 or later
- PHP 8.1 or later

---

## Installation

Install via Composer:

```
composer require linkrobins/referral
```

Then run migrations and clear the cache:

```
php flarum migrate
php flarum cache:clear
```

Enable the extension in the Flarum admin panel under **Extensions**.

---

## Usage

### For Members

1. Go to your profile and click the **Referrals** tab
2. Your personal invite code is displayed — share it with anyone you want to invite
3. When someone registers using your code, you receive a notification and your referral count increases

### For New Users

1. Click **Sign Up**
2. Fill in your username, email, and password as normal
3. Enter the invite code you received in the **Invite Code** field
4. Complete registration

### For Admins

1. Go to **Admin → Extensions → Link Robins Referral**
2. Toggle **Require invite code to register** to enforce invite-only registration
3. When enabled, no one can register without a valid invite code

---

## Translations

The extension ships with English (`locale/en.yml`). To add a translation:

1. Create a new file in the `locale/` directory named after the [ISO 639-1 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes), e.g.:
   - `ko.yml` — Korean
   - `zh.yml` — Simplified Chinese
   - `es.yml` — Spanish

2. Copy the contents of `en.yml` and translate the values

3. No code changes needed — Flarum picks up locale files automatically

### Example (`es.yml`)

```yaml
linkrobins-referral:
  forum:
    profile:
      tab: Referencias
      invite_code_title: Tu Código de Invitación
      invite_code_help: Comparte este código con quien quieras invitar.
      copy: Copiar
      total_referrals: Total de Referencias
      no_referrals: "¡Aún no hay referencias. Comparte tu código para empezar!"
    sign_up:
      invite_code_label: Código de invitación
      invite_code_label_required: "Código de invitación *"
      invite_code_placeholder: ej. K7XM2QNP
    notification:
      user_referred: "{displayName} se registró usando tu código de invitación."
  admin:
    settings:
      require_label: Requerir código de invitación para registrarse
      require_help: Cuando está activado, los usuarios deben ingresar un código válido.
      enabled: Activado
      disabled: Desactivado
  validation:
    required: Se requiere un código de invitación para registrarse.
    invalid: Código de invitación inválido.
```

---

## Database

The extension creates two tables:

- `referral_invite_codes` — stores each member's unique invite code and use count
- `referral_invited_user` — records which user referred which

These are created automatically when the extension is enabled. They are safely removed when the extension is uninstalled.

---

## Links

- [Packagist](https://packagist.org/packages/linkrobins/referral)
- [GitHub](https://github.com/linkrobins/referral)
- [Link Robins](https://linkrobins.com)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
