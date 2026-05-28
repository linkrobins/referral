<?php

use Flarum\Api\Resource\UserResource;
use Flarum\Extend;
use LinkRobins\Referral\Api\UserResourceFields;
use LinkRobins\Referral\Http\StripRefParamMiddleware;
use LinkRobins\Referral\RecordReferral;
use LinkRobins\Referral\ValidateInviteCode;

return [
    (new Extend\Middleware('forum'))
        ->add(StripRefParamMiddleware::class),

    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\ApiResource(UserResource::class))
        ->fields(UserResourceFields::class),

    (new Extend\Event())
        ->subscribe(ValidateInviteCode::class)
        ->subscribe(RecordReferral::class),

    (new Extend\Settings())
        ->serializeToForum('referralRequired', 'linkrobins-referral.require_referral', 'boolval')
        ->default('linkrobins-referral.require_referral', '0'),
];
