<?php

/*
 * This file is part of linkrobins/referral.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace LinkRobins\Referral\Tests\integration\api;

use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;

class ReferredUsersIncludeTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    public function setUp(): void
    {
        parent::setUp();

        $this->extension('linkrobins-referral');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(), // id 2, the referrer
                ['id' => 3, 'username' => 'invitee', 'password' => '$2y$10$LO59tiT7uggl6Oe23o/O6.utnF6ipngYjvMvaxo1TciKqBttDNKim', 'email' => 'invitee@machine.local', 'is_email_confirmed' => 1, 'referral_count' => 0],
            ],
            'referral_invited_user' => [
                ['user_id' => 3, 'referred_by_user_id' => 2],
            ],
        ]);

        // The referrer's denormalised counter.
        $this->database()->table('users')->where('id', 2)->update(['referral_count' => 1]);
    }

    #[Test]
    public function referred_users_relationship_serialises_for_the_owner(): void
    {
        $response = $this->send(
            $this->request('GET', '/api/users/2', ['authenticatedAs' => 2])
                ->withQueryParams(['include' => 'referredUsers'])
        );

        $this->assertEquals(200, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);

        $linkage = array_column($body['data']['relationships']['referredUsers']['data'] ?? [], 'id');
        $this->assertContains('3', $linkage, 'The referred user should appear in the relationship linkage.');

        $includedUserIds = array_column(
            array_filter($body['included'] ?? [], fn ($r) => $r['type'] === 'users'),
            'id'
        );
        $this->assertContains('3', $includedUserIds, 'The referred user should be included in the response.');
    }

    #[Test]
    public function referred_users_relationship_is_hidden_from_other_users(): void
    {
        $response = $this->send(
            $this->request('GET', '/api/users/2', ['authenticatedAs' => 3])
                ->withQueryParams(['include' => 'referredUsers'])
        );

        // Not the owner and not an admin: the relationship is not exposed, and
        // the request must still succeed rather than error.
        $this->assertEquals(200, $response->getStatusCode(), (string) $response->getBody());

        $body = json_decode((string) $response->getBody(), true);
        $includedUserIds = array_column(
            array_filter($body['included'] ?? [], fn ($r) => $r['type'] === 'users'),
            'id'
        );
        $this->assertNotContains('3', $includedUserIds);
    }
}
