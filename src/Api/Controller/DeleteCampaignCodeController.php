<?php

namespace LinkRobins\Referral\Api\Controller;

use Flarum\Http\RequestUtil;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\EmptyResponse;
use LinkRobins\Referral\InviteCode;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

class DeleteCampaignCodeController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        // Flarum merges matched route placeholders into the query params.
        $id = (int) Arr::get($request->getQueryParams(), 'id');

        // Only ever delete campaign (user-less) codes -- never a user's
        // personal code -- via this endpoint.
        InviteCode::whereNull('user_id')->where('id', $id)->delete();

        return new EmptyResponse(204);
    }
}
