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

class MyCodeTest extends TestCase
{
    use RetrievesAuthorizedUsers;

    public function setUp(): void
    {
        parent::setUp();

        $this->extension('linkrobins-referral');

        $this->prepareDatabase([
            'users' => [
                $this->normalUser(), // id 2
            ],
        ]);
    }

    #[Test]
    public function guests_cannot_generate_a_code(): void
    {
        $response = $this->send(
            $this->request('POST', '/api/referral/my-code')
        );

        // Rejected before anything is written (CSRF 400 or auth 401 -- the
        // guarantee that matters is that no code row appears).
        $this->assertGreaterThanOrEqual(400, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->count());
    }

    #[Test]
    public function an_eligible_user_gets_a_stable_code(): void
    {
        $first = $this->send(
            $this->request('POST', '/api/referral/my-code', ['authenticatedAs' => 2])
        );

        $this->assertEquals(200, $first->getStatusCode());
        $code = json_decode($first->getBody()->getContents(), true)['data']['code'];
        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{8}$/', $code);

        // Calling it again must return the same code, not mint a new row.
        $second = $this->send(
            $this->request('POST', '/api/referral/my-code', ['authenticatedAs' => 2])
        );

        $this->assertEquals($code, json_decode($second->getBody()->getContents(), true)['data']['code']);
        $this->assertEquals(1, $this->database()->table('referral_invite_codes')->count());
    }

    #[Test]
    public function an_ineligible_user_is_denied(): void
    {
        $this->setting('linkrobins-referral.eligibility_min_posts', '5');

        $response = $this->send(
            $this->request('POST', '/api/referral/my-code', ['authenticatedAs' => 2])
        );

        $this->assertEquals(403, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->count());
    }
}
