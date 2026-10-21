# CascadeOS AWS simulation — post-judging improvement

This Lambda contains the real deterministic calculation functions from the repository: lib/scenario.ts and lib/upstream.ts. Instead of only saving scenarios, AWS will calculate baseline evacuation feasibility, the earlier gate-failure scenario, and optional upstream impact. The browser-local model remains available. Outputs are illustrative and not official forecasts.

Architecture: Browser -> Next.js /api/aws-simulate on Vercel -> IAM SigV4 -> API Gateway HTTP API POST /simulate -> AWS Lambda Node.js 20.x -> calculated scenario results.

## Build and deploy

From aws/simulation directory:
1. Run npm install
2. Run npm run package
3. Upload lambda-simulation.zip to a Lambda function named cascadeos-simulation in ap-south-1 with runtime Node.js 20.x and handler index.handler.
4. Create API Gateway HTTP API POST /simulate integrated with the function, using AWS_IAM route authorization, and configure invoke permission for API Gateway.
5. Restrict your dedicated server IAM identity to execute-api:Invoke on only that API route; enable CloudWatch logs.
6. Configure Vercel server-only variable AWS_SIMULATION_API_URL=https://YOUR_ID.execute-api.ap-south-1.amazonaws.com/simulate. Its existing server-only AWS credentials/provider chain must be authorized to call this new API. Do not expose credentials in public variables or commit them.
7. Redeploy Vercel and click RUN ON AWS LAMBDA in Saved scenarios & draft tools. Successful results show execution provenance; errors are not disguised as success.

To validate, compare the Lambda baseline and earlier-gate result with the local deterministic model for the same inputs, and check CloudWatch logs. The previous AWS scenario-save endpoint still works separately.

## Data relevance and safety

No Indian river gauges are integrated yet. Open-Meteo coordinate-based precipitation remains a model/observation blend, not an on-site gauge. A future CWC/IMD connector needs a documented, authorized accessible data source, provenance and freshness checks. Do not treat USGS as Indian gauge data. SNS alerting and calibrated hydrodynamic forecasts are not implemented.

These changes are post-14 October 2026 judging improvements and do not affect marks already awarded.
