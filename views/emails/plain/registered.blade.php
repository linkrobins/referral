<x-mail::plain.notification>
<x-slot:body>
{{ $translator->trans('linkrobins-referral.email.registered_body', ['name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-referral.email.someone')]) }}

{{ $translator->trans('linkrobins-referral.email.view_profile') }}: {{ $url->to('forum')->base() . '/u/' . ($blueprint->getFromUser()?->username ?? '') }}
</x-slot:body>
</x-mail::plain.notification>
