<?php

namespace LinkRobins\Referral\Api\Controller;

use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use LinkRobins\Referral\InviteCode;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class ListCampaignCodesController implements RequestHandlerInterface
{
    /**
     * Newest-first campaign codes, hard-capped so an admin who has accumulated
     * thousands of codes over many campaigns can't pull them all in one
     * unbounded query/response. The total is reported so the UI can show when
     * the list is truncated.
     */
    private const LIMIT = 200;

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $query = InviteCode::whereNull('user_id');
        $total = (clone $query)->count();

        $codes = $query->orderBy('id', 'desc')
            ->limit(self::LIMIT)
            ->get();

        return new JsonResponse([
            'data' => $codes->map(fn (InviteCode $c) => $c->toAdminArray())->all(),
            'meta' => [
                'total'     => $total,
                'limit'     => self::LIMIT,
                'truncated' => $total > self::LIMIT,
            ],
        ]);
    }
}
