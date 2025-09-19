	Category																									
	Configure Properties																									
																										
	Security and config hygiene	Keep IDs and settings in Properties, not in sheets.																								
	Universal best practices for Apps Script + Sheets + external API pipelines																									
	• Data model and schema																									
		Define stable internal keys (e.g., game_id, url) and enforce uniqueness.																								
		Keep raw source fields (PGN, JSON fragments) alongside normalized columns for reprocessing.																								
		Version your schema; track migrations with a schema_version meta key.																								
																										
	• Idempotency and state																									
		Make every run idempotent: writes should be safe to retry.																								
		Use cursors (per-archive lastIngestedUrl, lastSeenEndTime) over full-sheet scans.																								
		Persist state in PropertiesService and mirror to meta sheets for auditability.																								
																										
	• API usage																									
		Use ETags + conditional GET; on 304 skip work.																								
		Respect rate limits: exponential backoff with jitter on 429/5xx.																								
		Set a descriptive User-Agent; log request code/latency for diagnostics.																								
		Paginate deterministically; avoid unbounded loops.																								
																										
	• Performance																									
		Batch writes (setValues) and avoid getDataRange on huge sheets.																								
		Cache hot config (columns mapping) in CacheService with short TTL + change-detection.																								
		Process current/prior month only in incremental; mark old archives inactive to skip.																								
		Chunk large backfills to stay within execution time/memory limits.																								
																										
	• Reliability/resilience																									
		Use LockService to prevent overlapping triggers.																								
		Add circuit breakers: if error rate spikes, abort early and log.																								
		Guard against partial failures; write what succeeded, record what didn’t (dead-letter sheet).																								
																										
	• Observability																									
		Structured logs (timestamp, level, code, url, duration).																								
		Metrics: rows appended, archives checked, 2xx/304/4xx/5xx counts per run.																								
		Backfill progress table with cumulative counters; easy to spot stalls.																								
																										
	• Data quality																									
		Normalize timezones at ingestion; one canonical format.																								
		Validate critical fields (non-empty url, parseable end_time).																								
		Deduplicate at write time using keys; consider a small in-memory set for the newest archive.																								
																										
	• Security/compliance																									
		Store secrets/IDs in PropertiesService, not in sheets.																								
		Minimize PII; only store opponent username if needed.																								
		Respect API TOS; avoid scraping unofficial endpoints by default.																								
	• Operations																									
		Time-driven triggers: stagger schedules to avoid quota contention.																								
		Health-check run that only verifies ETags/latency without writing.																								
		Periodic “inactive recheck” window (e.g., monthly) to catch rare retro changes.																								
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
																										
API and Data Fetching																										
	Use UrlFetchApp efficiently:																									
		Set appropriate timeout values with muteHttpExceptions: true and custom timeout periods																								
		Implement retry logic for failed requests with exponential backoff																								
		Use UrlFetchApp.fetchAll() for multiple concurrent requests when possible																								
		Handle rate limits by implementing delays between requests																								
	Optimize HTTP requests:																									
		Include proper headers like User-Agent and Accept to avoid being blocked																								
		Use POST requests with payload when fetching large datasets																								
		Implement caching mechanisms to avoid redundant API calls																								
		Store API keys and sensitive data in PropertiesService, not hardcoded including chess account username used																								
Data Processing																										
	Parse JSON efficiently:																									
		Use JSON.parse() and handle malformed JSON with try-catch blocks																								
		Validate data structure before processing																								
		Filter and transform data in memory before writing to sheets																								
		Use Map and Set objects for fast lookups when processing large datasets																								
	Handle data transformation:																									
		Flatten nested JSON objects into sheet-friendly 2D arrays																								
		Standardize date formats and handle timezone conversions																								
		Clean and validate data (remove nulls, handle missing fields)																								
		Implement data type conversion (strings to numbers, etc.)																								
Google Sheets Operations																										
	Batch operations for performance:																									
		Use getRange().setValues() instead of setting individual cells																								
		Write data in chunks rather than all at once for very large datasets																								
		Use SpreadsheetApp.flush() strategically to force updates																								
	Optimize sheet structure:																									
		Create headers programmatically and freeze the header row																								
		Use appropriate column formatting (numbers, dates, text)																								
		Set column widths automatically based on content																								
		Consider using multiple sheets for different data types																								
Performance and Execution																										
	Manage execution time limits:																									
		Break large operations into smaller chunks																								
		Use time-based triggers for long-running processes																								
		Implement checkpoint/resume functionality for interrupted executions																								
		Monitor execution time with Utilities.getMethodName() and logging																								
	Memory management:																									
		Process data in batches to avoid memory limits																								
		Clear variables and arrays when no longer needed																								
		Use streaming approaches for very large datasets																								
		Implement garbage collection hints where appropriate																								
Error Handling and Logging																										
	Robust error handling:																									
		Wrap API calls in try-catch blocks with specific error handling																								
		Implement graceful degradation for partial failures																								
		Log errors with context using console.log() or Logger																								
		Send notification emails for critical failures																								
	Comprehensive logging:																									
		Log start/end times and record counts																								
		Track API response codes and error conditions																								
		Implement different log levels (info, warning, error)																								
		Use structured logging for easier debugging																								
Security and Maintenance																										
	Security considerations:																									
		Use OAuth2 for API authentication when possible																								
		Store credentials securely in PropertiesService																								
		Implement input validation and sanitization																								
		Use least-privilege principles for sheet access																								
	Code organization:																									
		Modularize code with separate functions for fetching, processing, and writing																								
		Use configuration objects for settings and parameters																								
		Implement helper functions for common operations																								
		Add comprehensive comments and documentation																								
Monitoring and Maintenance																										
	Implement monitoring:																									
		Add execution time tracking and performance metrics																								
		Set up alerts for failures or unusual conditions																								
		Track data freshness and update frequencies																								
		Monitor API usage against quotas and limits																								
	Considerations																									
		Response Format: All responses are JSON-LD compatible and can be treated as regular JSON.																								
		Timestamps: All time fields are Unix timestamps (seconds since January 1, 1970).																								
		Compression: Responses are gzip compressed if you include "Accept-Encoding: gzip" header, saving up to 80% bandwidth																								
