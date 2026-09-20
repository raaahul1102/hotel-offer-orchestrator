# Requirements Document

## Introduction

The Hotel Offer Orchestrator aggregates overlapping hotel offers from two mock suppliers, deduplicates hotels by name, and selects the best-priced offer for each hotel. The system exposes an HTTP API to retrieve deduplicated hotel listings for a given city, with optional price-range filtering. Comparison logic is orchestrated with Temporal, deduplicated results are cached in Redis (where price filtering is applied), and the entire service is containerized with Docker.

## Glossary

- **Orchestrator**: The overall system that aggregates, deduplicates, and serves hotel offers.
- **API_Service**: The Express HTTP layer that exposes public endpoints and mock supplier endpoints.
- **Workflow**: The Temporal workflow that orchestrates supplier calls and offer selection.
- **Supplier_Activity**: A Temporal activity that calls a single supplier's hotel API.
- **Supplier_A**: The first mock supplier, exposed at `GET /supplierA/hotels`.
- **Supplier_B**: The second mock supplier, exposed at `GET /supplierB/hotels`.
- **Cache_Store**: The Redis instance used to persist deduplicated hotel lists and perform price filtering.
- **Hotel_Offer**: A single hotel entry with fields: `name`, `price`, `supplier`, and `commissionPct`.
- **Supplier_Hotel**: A raw hotel record returned by a supplier with fields: `hotelId`, `name`, `price`, `city`, and `commissionPct`.
- **City**: The location query parameter identifying which hotels to retrieve.
- **minPrice**: The inclusive lower bound of the price filter, in the same currency unit as `price`.
- **maxPrice**: The inclusive upper bound of the price filter, in the same currency unit as `price`.
- **Best_Offer**: For a given hotel name, the Hotel_Offer with the lowest `price` among all supplier offers for that name.

## Requirements

### Requirement 1: Retrieve Deduplicated Hotels by City

**User Story:** As an API consumer, I want to retrieve a deduplicated list of the best-priced hotels for a city, so that I can present one optimal offer per hotel.

#### Acceptance Criteria

1. WHEN a GET request is received at `/api/hotels` with a `city` query parameter, THE API_Service SHALL trigger the Workflow to aggregate offers for the specified City.
2. WHEN the Workflow executes, THE Workflow SHALL invoke the Supplier_A activity and the Supplier_B activity in parallel.
3. THE Workflow SHALL request hotels for the requested City from each Supplier_Activity.
4. WHEN both suppliers return offers, THE Workflow SHALL deduplicate offers by hotel `name`.
5. WHEN a hotel `name` is returned by both Supplier_A and Supplier_B, THE Workflow SHALL select the Hotel_Offer with the lower `price` as the Best_Offer for that `name`.
6. WHEN Supplier_A and Supplier_B return an equal `price` for the same hotel `name`, THE Workflow SHALL select the Supplier_A Hotel_Offer as the Best_Offer for that `name`.
7. WHEN a hotel `name` is returned by exactly one supplier, THE Workflow SHALL select that supplier's Hotel_Offer as the Best_Offer for that `name`.
8. WHEN the Workflow completes, THE API_Service SHALL return the deduplicated list of Best_Offer entries to the client with HTTP status 200.
9. WHEN no supplier returns any hotel for the requested City, THE API_Service SHALL return an empty list with HTTP status 200.
10. IF the `city` query parameter is absent, empty, or contains only whitespace, THEN THE API_Service SHALL return an error response with HTTP status 400 and a descriptive error message.
11. WHEN deduplicating offers by hotel `name`, THE Workflow SHALL compare names using case-insensitive matching with leading and trailing whitespace removed, so that names differing only in case or surrounding whitespace are treated as the same hotel.
12. IF a Supplier_Activity is treated as failed as defined in Requirement 5, THEN THE Workflow SHALL continue with the offers from the remaining responsive supplier.

### Requirement 2: Response Format

**User Story:** As an API consumer, I want a consistent response shape, so that I can reliably parse hotel offers.

#### Acceptance Criteria

1. WHEN the API_Service returns hotel offers, THE API_Service SHALL format each Hotel_Offer as a JSON object containing exactly the fields `name` (non-empty string), `price` (number greater than 0), `supplier` (string), and `commissionPct` (number from 0 to 100 inclusive).
2. THE API_Service SHALL set the `supplier` field of each Hotel_Offer to the identifier of the supplier that provided the selected offer, where the value is exactly `"Supplier A"` for Supplier_A and exactly `"Supplier B"` for Supplier_B.
3. WHEN the API_Service returns hotel offers, THE API_Service SHALL return the offers as a JSON array.
4. WHEN the deduplicated result contains no offers, THE API_Service SHALL return an empty JSON array rather than a null or absent body.
5. THE API_Service SHALL return the offers ordered by `price` in ascending order.

### Requirement 3: Price Range Filtering via Redis

**User Story:** As an API consumer, I want to filter hotels by a price range, so that I only see offers within my budget.

#### Acceptance Criteria

1. WHEN the API_Service produces a deduplicated list of Best_Offer entries, THE API_Service SHALL store the deduplicated list in the Cache_Store keyed by the case-insensitive City value with a time-to-live of 300 seconds.
2. WHEN a GET request is received at `/api/hotels` with `city`, `minPrice`, and `maxPrice` query parameters AND a deduplicated list for the requested City exists in the Cache_Store, THE API_Service SHALL apply price filtering within the Cache_Store.
3. IF a GET request is received at `/api/hotels` with price filter parameters AND no deduplicated list for the requested City exists in the Cache_Store, THEN THE API_Service SHALL trigger the Workflow to regenerate the deduplicated list, store it in the Cache_Store, and then apply price filtering.
4. WHEN price filtering is applied, THE Cache_Store SHALL return only Hotel_Offer entries whose `price` is greater than or equal to the effective lower bound and less than or equal to the effective upper bound.
5. WHEN price filtering is applied AND no Hotel_Offer entry satisfies the price range, THE API_Service SHALL return an empty JSON array with HTTP status 200.
6. IF `minPrice` is greater than `maxPrice`, THEN THE API_Service SHALL return an error response with HTTP status 400 and an error message indicating that minPrice must not exceed maxPrice.
7. IF `minPrice` or `maxPrice` is provided as a non-numeric value or is negative, THEN THE API_Service SHALL return an error response with HTTP status 400 and an error message indicating the invalid price parameter.
8. WHERE only `minPrice` is provided, THE API_Service SHALL apply `minPrice` as the effective lower bound and treat the effective upper bound as unbounded.
9. WHERE only `maxPrice` is provided, THE API_Service SHALL apply `maxPrice` as the effective upper bound and treat the effective lower bound as 0.

### Requirement 4: Mock Supplier Endpoints

**User Story:** As a developer, I want mock supplier endpoints within the service, so that I can test the orchestration without external dependencies.

#### Acceptance Criteria

1. WHEN a GET request is received at `/supplierA/hotels`, THE API_Service SHALL return a JSON array containing at least 3 Supplier_Hotel records for Supplier_A.
2. WHEN a GET request is received at `/supplierB/hotels`, THE API_Service SHALL return a JSON array containing at least 3 Supplier_Hotel records for Supplier_B.
3. THE API_Service SHALL format each Supplier_Hotel as a JSON object containing the fields `hotelId` (non-empty string, unique within a single supplier response), `name` (non-empty string), `price` (number greater than 0), `city` (non-empty string), and `commissionPct` (number from 0 to 100 inclusive).
4. THE API_Service SHALL include at least one Supplier_Hotel `name` value that matches, using case-insensitive comparison, a Supplier_Hotel `name` value in the other supplier's response where both records share the same `city` value under case-insensitive comparison.
5. WHILE the mock supplier data is served, THE API_Service SHALL return identical Supplier_Hotel records for repeated GET requests to the same endpoint, such that field values do not change between requests.

### Requirement 5: Supplier Failure Handling

**User Story:** As an API consumer, I want the system to degrade gracefully when a supplier is unavailable, so that I still receive usable results.

#### Acceptance Criteria

1. THE Workflow SHALL treat a Supplier_Activity as failed when it does not return a successful response within a 5-second per-attempt timeout after exhausting up to 2 additional retry attempts.
2. IF exactly one Supplier_Activity is treated as failed, THEN THE Workflow SHALL produce the deduplicated list using the offers from the remaining responsive supplier and THE API_Service SHALL return the result with HTTP status 200.
3. IF all Supplier_Activity calls are treated as failed, THEN THE API_Service SHALL return an error response with HTTP status 502 and a descriptive error message.
4. WHEN a Supplier_Activity is treated as failed, THE Workflow SHALL record a log entry identifying the failed supplier and the failure reason.

### Requirement 6: Health Check

**User Story:** As an operator, I want a health endpoint that reports supplier health, so that I can monitor system readiness.

#### Acceptance Criteria

1. WHEN a GET request is received at `/health`, THE API_Service SHALL return a response body that reports, for each of Supplier_A and Supplier_B, a reachability status of either reachable or unreachable.
2. THE API_Service SHALL classify a supplier as reachable when a request to that supplier's endpoint returns a successful response within 2 seconds, and as unreachable otherwise.
3. WHEN a GET request is received at `/health` AND both Supplier_A and Supplier_B are classified as reachable, THE API_Service SHALL return HTTP status 200.
4. IF at least one supplier is classified as unreachable, THEN THE API_Service SHALL return HTTP status 503 and include in the response body an identifier for each supplier classified as unreachable.

### Requirement 7: Logging and Error Handling

**User Story:** As an operator, I want structured logging and error handling in the workflow and activities, so that I can diagnose failures.

#### Acceptance Criteria

1. WHEN a Supplier_Activity starts, THE Supplier_Activity SHALL record a log entry identifying the supplier and requested City.
2. WHEN the Workflow completes, THE Workflow SHALL record a log entry containing the count of deduplicated offers returned.
3. IF an error occurs during request handling that is not covered by the specific handling defined in Requirements 1, 3, and 5, THEN THE API_Service SHALL return an error response with HTTP status 500 and an error message containing a failure category, without exposing internal stack details.
4. WHEN the API_Service returns an HTTP status 500 response, THE API_Service SHALL record a log entry at error severity describing the failure.

### Requirement 8: Containerized Deployment

**User Story:** As an operator, I want the service containerized with its dependencies, so that I can deploy it consistently.

#### Acceptance Criteria

1. THE Orchestrator SHALL provide a Dockerfile that builds the API_Service into a runnable container image that starts the API_Service process on container launch without additional manual steps.
2. THE Orchestrator SHALL provide a Docker Compose configuration that defines and starts the API_Service, the Cache_Store, and the Temporal service as separate services within a single deployment.
3. WHEN the Docker Compose configuration is started, THE Orchestrator SHALL expose the API_Service HTTP endpoints on the host port specified by a Docker Compose environment variable, defaulting to a documented port when the variable is unset.
4. WHILE the Docker Compose configuration is starting, THE Orchestrator SHALL start the API_Service only after both the Cache_Store and the Temporal service report a healthy status.
5. WHEN the Docker Compose configuration is started, THE Orchestrator SHALL poll the API_Service endpoints on the configured host port for up to 60 seconds to confirm reachability.
6. IF the API_Service endpoints are not reachable on the configured host port within 60 seconds after the Docker Compose configuration starts, THEN THE Orchestrator SHALL treat the startup as a failure, halt the Docker Compose deployment, and emit a startup log entry indicating which service failed to become reachable.
