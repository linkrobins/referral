<?php

namespace LinkRobins\Referral\Api\Controller;

use Flarum\Http\RequestUtil;
use Flarum\User\Exception\PermissionDeniedException;
use Laminas\Diactoros\Response\JsonResponse;
use LinkRobins\Referral\EligibilityChecker;
use LinkRobins\Referral\InviteCode;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Generates (or returns) the acting user's personal invite code. This is the
 * write half of the referral-code flow, split out of serialization so a GET on
 * /api/users never inserts a row. The frontend calls this once when an eligible
 * user opens their referrals tab; the referralCode attribute stays read-only.
 */
class GenerateMyCodeController implements RequestHandlerInterface
{
    public function __construct(
        protected EligibilityChecker $eligibility
    ) {}

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        if (! $this->eligibility->isEligible($actor)) {
            throw new PermissionDeniedException();
        }

        $code = InviteCode::getOrCreateForUser($actor);

        return new JsonResponse(['data' => ['code' => $code->code]]);
    }
}
