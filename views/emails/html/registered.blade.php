<x-mail::html.notification>
    <x-slot:body>
        <p>
            {{ $translator->trans('linkrobins-referral.email.registered_body', [
                'name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-referral.email.someone'),
            ]) }}
        </p>
        <p><a href="{{ $url->to('forum')->base() . '/u/' . ($blueprint->getFromUser()?->username ?? '') }}">{{ $translator->trans('linkrobins-referral.email.view_profile') }}</a></p>
    </x-slot:body>

    <x-slot:preview>
        {{ $translator->trans('linkrobins-referral.email.registered_body', [
            'name' => $blueprint->getFromUser()?->display_name ?? $translator->trans('linkrobins-referral.email.someone'),
        ]) }}
    </x-slot:preview>
</x-mail::html.notification>
