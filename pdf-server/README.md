# OpenLab PDF Server

Standalone Puppeteer PDF generation server.

## Start
node server.js

## Runs on
http://localhost:3002

## Endpoint
POST /generate-pdf
Body: { html: string, filename: string }
Returns: PDF binary
