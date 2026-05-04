<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('referral_invite_codes')) {
            $schema->create('referral_invite_codes', function (Blueprint $table) {
                $table->increments('id');
                $table->timestamps();
                $table->unsignedInteger('user_id');
                $table->string('code', 16)->unique();
                $table->unsignedInteger('uses')->default(0);
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    },
    'down' => function (Builder $schema) {
        $schema->dropIfExists('referral_invite_codes');
    },
];
