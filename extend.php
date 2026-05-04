<?php

use Flarum\Api\Resource\UserResource;
use Flarum\Extend;
use LinkRobins\Referral\Api\UserResourceFields;
use LinkRobins\Referral\Notification\UserReferredNotification;
use LinkRobins\Referral\RecordReferral;
use LinkRobins\Referral\ValidateInviteCode;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/forum.js'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\ApiResource(UserResource::class))
        ->fields(UserResourceFields::class),

    (new Extend\Event())
        ->subscribe(ValidateInviteCode::class)
        ->subscribe(RecordReferral::class),

    (new Extend\Notification())
        ->type(UserReferredNotification::class, ['alert']),

    (new Extend\Settings())
        ->serializeToForum('referralRequired', 'linkrobins-referral.require_referral', 'boolval')
        ->default('linkrobins-referral.require_referral', '0'),
];
