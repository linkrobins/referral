<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/*
 * Campaign codes: admin-created invite codes that are not tied to any user.
 *
 * - user_id becomes nullable; a NULL user_id marks a standalone campaign code.
 *   The unique index on user_id keeps one code per real user while allowing
 *   many campaign codes (MySQL/MariaDB and Postgres both permit multiple NULLs
 *   in a unique index).
 * - label    : optional admin-facing name for the campaign (e.g. "Twitter Q3").
 * - expires_at: optional cut-off after which the code stops validating.
 */
return [
    'up' => function (Builder $schema) {
        $schema->table('referral_invite_codes', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable()->change();
        });

        if (! $schema->hasColumn('referral_invite_codes', 'label')) {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->string('label')->nullable();
            });
        }

        if (! $schema->hasColumn('referral_invite_codes', 'expires_at')) {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->timestamp('expires_at')->nullable();
            });
        }
    },

    'down' => function (Builder $schema) {
        // Remove the user-less campaign codes before restoring the NOT NULL
        // constraint, otherwise the column change would fail.
        $schema->getConnection()->table('referral_invite_codes')->whereNull('user_id')->delete();

        if ($schema->hasColumn('referral_invite_codes', 'expires_at')) {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->dropColumn('expires_at');
            });
        }

        if ($schema->hasColumn('referral_invite_codes', 'label')) {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->dropColumn('label');
            });
        }

        $schema->table('referral_invite_codes', function (Blueprint $table) {
            $table->unsignedInteger('user_id')->nullable(false)->change();
        });
    },
];
