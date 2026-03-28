import { Router } from "express";

import {
  clampOperatorEventLimit,
  type OperatorObservabilityService
} from "../observability/operator-events.js";

export interface InternalObservabilityRouterOptions {
  observabilityService: OperatorObservabilityService;
}

export function createInternalObservabilityRouter(
  options: InternalObservabilityRouterOptions
) {
  const router = Router();

  router.get("/internal/observability/events", (request, response) => {
    response.json(
      options.observabilityService.listRecentEvents(
        clampOperatorEventLimit(request.query.limit)
      )
    );
  });

  router.get("/internal/observability/summary", (_request, response) => {
    response.json(options.observabilityService.getSummary());
  });

  return router;
}
