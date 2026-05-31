<?php

namespace LinkRobins\Referral;

use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;

/**
 * Decides whether a given user is allowed to have a personal invite code.
 *
 * Admins and whitelisted usernames always qualify. Everyone else must satisfy
 * every configured rule (allowed groups, minimum post count, minimum account
 * age). Any rule left at its empty/zero default is skipped.
 */
class EligibilityChecker
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {}

    public function isEligible(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        $whitelist = $this->whitelist();
        if ($whitelist && in_array(strtolower($user->username), $whitelist, true)) {
            return true;
        }

        $groups = $this->allowedGroups();
        if ($groups) {
            $userGroupIds = $user->groups->pluck('id')->map(fn ($id) => (int) $id)->all();
            if (! array_intersect($groups, $userGroupIds)) {
                return false;
            }
        }

        $minPosts = (int) $this->settings->get('linkrobins-referral.eligibility_min_posts', 0);
        if ($minPosts > 0 && (int) $user->comment_count < $minPosts) {
            return false;
        }

        $minAge = (int) $this->settings->get('linkrobins-referral.eligibility_min_age_days', 0);
        if ($minAge > 0) {
            $joined = $user->joined_at;
            // Not eligible until the account is at least $minAge days old.
            if (! $joined || $joined->copy()->addDays($minAge)->isFuture()) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return int[]
     */
    protected function allowedGroups(): array
    {
        $raw = $this->settings->get('linkrobins-referral.eligibility_groups', '');
        if (! $raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return [];
        }

        return array_values(array_filter(array_map('intval', $decoded)));
    }

    /**
     * @return string[] lowercased usernames
     */
    protected function whitelist(): array
    {
        $raw = (string) $this->settings->get('linkrobins-referral.eligibility_whitelist', '');
        if (trim($raw) === '') {
            return [];
        }

        $parts = preg_split('/[\s,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        return array_map(fn ($p) => strtolower(trim($p)), $parts);
    }
}
