<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/*
 * Denormalised counter of how many users each user has referred.
 *
 * Previously the `referralCount` API attribute ran a COUNT() query per
 * serialized user, which is an N+1 on any multi-user response (e.g. a
 * discussion's post authors). This column is read straight off the loaded
 * users row instead, and is maintained incrementally in RecordReferral.
 */
return [
    'up' => function (Builder $schema) {
        if (! $schema->hasColumn('users', 'referral_count')) {
            $schema->table('users', function (Blueprint $table) {
                $table->unsignedInteger('referral_count')->default(0);
            });
        }

        // Backfill from existing referral relations so the cached count is
        // correct for users created before this migration. The table prefix is
        // applied to the UPDATE target by the query builder, and prepended to
        // the raw correlated subquery so forums using a prefix backfill the
        // right tables instead of erroring / leaving every count at 0.
        $connection = $schema->getConnection();
        $prefix     = $connection->getTablePrefix();
        $users      = $prefix . 'users';
        $invited    = $prefix . 'referral_invited_user';

        $connection->table('users')->update([
            'referral_count' => $connection->raw(
                "(SELECT COUNT(*) FROM {$invited} WHERE {$invited}.referred_by_user_id = {$users}.id)"
            ),
        ]);
    },

    'down' => function (Builder $schema) {
        if ($schema->hasColumn('users', 'referral_count')) {
            $schema->table('users', function (Blueprint $table) {
                $table->dropColumn('referral_count');
            });
        }
    },
];
