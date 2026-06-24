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
        // correct for users created before this migration. Only users who
        // actually referred someone need a non-zero count; everyone else keeps
        // the column default of 0. Restricting the write set to real referrers
        // -- and updating them in chunks -- avoids holding a write lock on the
        // whole users table while a correlated COUNT() runs per row, which on a
        // large forum would queue registrations and risk a migration timeout.
        // The query builder applies the table prefix to both tables for us.
        $connection = $schema->getConnection();

        $connection->table('referral_invited_user')
            ->select('referred_by_user_id')
            ->selectRaw('COUNT(*) as referral_total')
            ->whereNotNull('referred_by_user_id')
            ->groupBy('referred_by_user_id')
            ->orderBy('referred_by_user_id')
            ->chunk(500, function ($rows) use ($connection) {
                foreach ($rows as $row) {
                    $connection->table('users')
                        ->where('id', $row->referred_by_user_id)
                        ->update(['referral_count' => (int) $row->referral_total]);
                }
            });
    },

    'down' => function (Builder $schema) {
        if ($schema->hasColumn('users', 'referral_count')) {
            $schema->table('users', function (Blueprint $table) {
                $table->dropColumn('referral_count');
            });
        }
    },
];
