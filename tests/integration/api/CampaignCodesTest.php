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

class CampaignCodesTest extends TestCase
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
    public function campaign_management_is_admin_only(): void
    {
        $list = $this->send(
            $this->request('GET', '/api/referral/campaign-codes', ['authenticatedAs' => 2])
        );
        $this->assertEquals(403, $list->getStatusCode());

        $create = $this->send(
            $this->request('POST', '/api/referral/campaign-codes', [
                'authenticatedAs' => 2,
                'json' => ['data' => ['attributes' => ['label' => 'Sneaky']]],
            ])
        );
        $this->assertEquals(403, $create->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->count());
    }

    #[Test]
    public function admins_can_create_and_list_campaign_codes(): void
    {
        $create = $this->send(
            $this->request('POST', '/api/referral/campaign-codes', [
                'authenticatedAs' => 1,
                'json' => ['data' => ['attributes' => ['label' => 'Summer launch']]],
            ])
        );

        $this->assertEquals(201, $create->getStatusCode());
        $created = json_decode($create->getBody()->getContents(), true)['data'];
        $this->assertEquals('Summer launch', $created['label']);

        $list = $this->send(
            $this->request('GET', '/api/referral/campaign-codes', ['authenticatedAs' => 1])
        );

        $this->assertEquals(200, $list->getStatusCode());
        $body = json_decode($list->getBody()->getContents(), true);
        $this->assertCount(1, $body['data']);
        $this->assertEquals($created['code'], $body['data'][0]['code']);
        $this->assertEquals(1, $body['meta']['total']);
        $this->assertFalse($body['meta']['truncated']);
    }

    #[Test]
    public function an_overlong_label_is_rejected(): void
    {
        $response = $this->send(
            $this->request('POST', '/api/referral/campaign-codes', [
                'authenticatedAs' => 1,
                'json' => ['data' => ['attributes' => ['label' => str_repeat('x', 256)]]],
            ])
        );

        $this->assertEquals(422, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->count());
    }

    #[Test]
    public function an_unparseable_expiry_is_rejected(): void
    {
        $response = $this->send(
            $this->request('POST', '/api/referral/campaign-codes', [
                'authenticatedAs' => 1,
                'json' => ['data' => ['attributes' => ['expiresAt' => 'not-a-date']]],
            ])
        );

        $this->assertEquals(422, $response->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->count());
    }

    #[Test]
    public function the_delete_endpoint_never_touches_personal_codes(): void
    {
        $this->prepareDatabase([
            'referral_invite_codes' => [
                ['id' => 1, 'user_id' => 2, 'code' => 'PERSONAL', 'uses' => 0],
                ['id' => 2, 'user_id' => null, 'code' => 'CAMPAIGN', 'uses' => 0, 'label' => 'Launch'],
            ],
        ]);

        // Deleting a personal code through the campaign endpoint is a no-op.
        $personal = $this->send(
            $this->request('DELETE', '/api/referral/campaign-codes/1', ['authenticatedAs' => 1])
        );
        $this->assertEquals(204, $personal->getStatusCode());
        $this->assertEquals(1, $this->database()->table('referral_invite_codes')->where('id', 1)->count());

        $campaign = $this->send(
            $this->request('DELETE', '/api/referral/campaign-codes/2', ['authenticatedAs' => 1])
        );
        $this->assertEquals(204, $campaign->getStatusCode());
        $this->assertEquals(0, $this->database()->table('referral_invite_codes')->where('id', 2)->count());
    }
}
