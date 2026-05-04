<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

return [
    'up' => function (Builder $schema) {
        if (!$schema->hasTable('referral_invited_user')) {
            $schema->create('referral_invited_user', function (Blueprint $table) {
                $table->increments('id');
                $table->timestamps();
                $table->unsignedInteger('user_id')->unique();
                $table->unsignedInteger('referred_by_user_id');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('referred_by_user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }
    },
    'down' => function (Builder $schema) {
        $schema->dropIfExists('referral_invited_user');
    },
];
