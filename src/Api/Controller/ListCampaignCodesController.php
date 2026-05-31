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
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        $codes = InviteCode::whereNull('user_id')
            ->orderBy('id', 'desc')
            ->get();

        return new JsonResponse([
            'data' => $codes->map(fn (InviteCode $c) => $c->toAdminArray())->all(),
        ]);
    }
}
