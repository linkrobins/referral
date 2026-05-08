<?php

namespace LinkRobins\Referral\Http;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class StripRefParamMiddleware implements MiddlewareInterface
{
    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $params = $request->getQueryParams();
        if (isset($params['ref'])) {
            unset($params['ref']);
            $request = $request->withQueryParams($params);
        }
        return $handler->handle($request);
    }
}
