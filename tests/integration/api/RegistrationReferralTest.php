<?php

/*
 * This file is part of linkrobins/referral.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace LinkRobins\Referral\Tests\integration\api;

use Carbon\Carbon;
use Flarum\Testing\integration\RetrievesAuthorizedUsers;
use Flarum\Testing\integration\TestCase;
use PHPUnit\Framework\Attributes\Test;
use Psr\Http\Message\ResponseInterface;

class RegistrationReferralTest extends TestCase
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

    /**
     * Register through the real signup flow: CSRF token first, then the POST,
     * with the referral cookie attached the same way the browser would send it.
     */
    private function register(?string $cookieCode = null): ResponseInterface
    {
        $request = $this->requestWithCsrfToken(
            $this->request('POST', '/api/users', [
                'json' => [
                    'data' => [
                        'attributes' => [
                            'username' => 'newmember',
                            'email' => 'newmember@machine.local',
                            'password' => 'a-strong-password',
                        ],
                    ],
                ],
            ])
        );

        if ($cookieCode !== null) {
            $request = $request->withCookieParams(
                array_merge($request->getCookieParams(), ['referral_code' => $cookieCode])
            );
        }

        return $this->send($request);
    }

    #[Test]
    public function a_valid_personal_code_records_the_referral(): void
    {
        $this->prepareDatabase([
            'referral_invite_codes' => [
                ['id' => 1, 'user_id' => 2, 'code' => 'TESTCODE', 'uses' => 0],
            ],
        ]);

        $response = $this->register('TESTCODE');

        $this->assertEquals(201, $response->getStatusCode());

        $newUser = $this->database()->table('users')->where('username', 'newmember')->first();
        $relation = $this->database()->table('referral_invited_user')->where('user_id', $newUser->id)->first();
        $this->assertNotNull($relation, 'Expected a referral relation to be recorded.');
        $this->assertEquals(2, $relation->referred_by_user_id);

        // The denormalised counters must stay in sync.
        $this->assertEquals(1, $this->database()->table('users')->where('id', 2)->value('referral_count'));
        $this->assertEquals(1, $this->database()->table('referral_invite_codes')->where('id', 1)->value('uses'));
    }

    #[Test]
    public function an_unknown_code_blocks_registration(): void
    {
        $response = $this->register('WRONGCODE');

        $this->assertEquals(422, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('users')->where('username', 'newmember')->count());
    }

    #[Test]
    public function an_expired_code_blocks_registration(): void
    {
        $this->prepareDatabase([
            'referral_invite_codes' => [
                ['id' => 1, 'user_id' => 2, 'code' => 'TESTCODE', 'uses' => 0, 'expires_at' => Carbon::now()->subDay()],
            ],
        ]);

        $response = $this->register('TESTCODE');

        $this->assertEquals(422, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('users')->where('username', 'newmember')->count());
    }

    #[Test]
    public function registration_without_a_code_works_when_referrals_are_optional(): void
    {
        $response = $this->register();

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invited_user')->count());
    }

    #[Test]
    public function require_referral_blocks_codeless_registration(): void
    {
        $this->setting('linkrobins-referral.require_referral', '1');

        $response = $this->register();

        $this->assertEquals(422, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('users')->where('username', 'newmember')->count());
    }

    #[Test]
    public function campaign_codes_count_uses_but_record_no_referrer(): void
    {
        $this->prepareDatabase([
            'referral_invite_codes' => [
                ['id' => 1, 'user_id' => null, 'code' => 'CAMPAIGN', 'uses' => 0, 'label' => 'Launch'],
            ],
        ]);

        $response = $this->register('CAMPAIGN');

        $this->assertEquals(201, $response->getStatusCode());
        $this->assertEquals(1, $this->database()->table('referral_invite_codes')->where('id', 1)->value('uses'));
        $this->assertEquals(0, $this->database()->table('referral_invited_user')->count());
    }
}
