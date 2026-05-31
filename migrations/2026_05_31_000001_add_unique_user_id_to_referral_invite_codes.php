<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/*
 * Enforce one invite code per user at the database level.
 *
 * getOrCreateForUser() used a check-then-insert without a DB constraint, so two
 * concurrent reads of a profile could each insert a row for the same user. This
 * unique index closes that race (the second insert now fails and the code falls
 * back to the existing row). Any duplicates created before this migration are
 * removed first, keeping the lowest id per user, so the index can be built.
 */
return [
    'up' => function (Builder $schema) {
        $connection = $schema->getConnection();
        $prefix     = $connection->getTablePrefix();
        $table      = $prefix . 'referral_invite_codes';

        // Remove pre-existing duplicate rows (keep the lowest id per user). The
        // derived-table wrapper is required so MySQL allows deleting from a
        // table it also selects from; the form is portable to Postgres too.
        $connection->statement(
            "DELETE FROM {$table} WHERE id NOT IN "
            . "(SELECT keep FROM (SELECT MIN(id) AS keep FROM {$table} GROUP BY user_id) t)"
        );

        try {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->unique('user_id');
            });
        } catch (\Throwable $e) {
            // Index already present (re-run / fresh install) -- nothing to do.
        }
    },

    'down' => function (Builder $schema) {
        try {
            $schema->table('referral_invite_codes', function (Blueprint $table) {
                $table->dropUnique(['user_id']);
            });
        } catch (\Throwable $e) {
            // Index missing -- nothing to drop.
        }
    },
];
