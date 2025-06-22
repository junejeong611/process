/**
 * A comprehensive service for collecting, aggregating,
 * and providing real-time and historical performance metrics
 * for the streaming architecture.
 *
 * This service is designed to be a singleton to ensure all
 * metrics are collected in one place.
 */
class StreamingMetricsService {
    constructor() {
        if (StreamingMetricsService.instance) {
            return StreamingMetricsService.instance;
        }

        // Placeholders for storing metrics. In a production system,
        // this would likely be an in-memory store like Redis or a
        // dedicated time-series database like InfluxDB or Prometheus.
        this.metrics = {
            text: {
                firstChunkLatency: [],
                completionSuccess: 0,
                completionFailure: 0,
            },
            voice: {
                firstAudioLatency: [],
                audioGaps: [],
                completionSuccess: 0,
                completionFailure: 0,
            },
            api: {
                claude: [],
                elevenLabs: [],
            },
            errors: [],
        };

        StreamingMetricsService.instance = this;
    }

    // --- Text Mode Metrics ---

    recordFirstChunk(mode, latency) {
        if (mode === 'text') {
            this.metrics.text.firstChunkLatency.push(latency);
        }
    }
    
    recordTextCompletion(success) {
        if (success) {
            this.metrics.text.completionSuccess++;
        } else {
            this.metrics.text.completionFailure++;
        }
    }


    // --- Voice Mode Metrics ---

    recordAudioLatency(latency) {
        this.metrics.voice.firstAudioLatency.push(latency);
    }

    recordAudioGap(gapDuration) {
        this.metrics.voice.audioGaps.push(gapDuration);
    }

    recordVoiceCompletion(success) {
        if (success) {
            this.metrics.voice.completionSuccess++;
        } else {
            this.metrics.voice.completionFailure++;
        }
    }

    // --- API Performance Metrics ---

    recordAPICall(service, duration, success, errorType = null) {
        const callData = {
            timestamp: Date.now(),
            duration,
            success,
            errorType,
        };

        if (service === 'claude') {
            this.metrics.api.claude.push(callData);
        } else if (service === 'elevenLabs') {
            this.metrics.api.elevenLabs.push(callData);
        }
    }

    // --- General Error Tracking ---

    recordErrorEvent(errorType, context, userImpact) {
        this.metrics.errors.push({
            timestamp: Date.now(),
            errorType,
            context,
            userImpact
        });
    }

    // --- Metrics Retrieval ---

    /**
     * Gathers and computes summary statistics for the dashboard.
     * In a real system, this would involve more complex aggregations,
     * possibly querying a dedicated metrics database.
     */
    getDashboardSummary() {
        const calculateAverage = (arr) => {
            if (arr.length === 0) return 0;
            return arr.reduce((a, b) => a + b, 0) / arr.length;
        };
        
        const calculateSuccessRate = (success, failure) => {
            const total = success + failure;
            if (total === 0) return 100;
            return (success / total) * 100;
        }

        const textSuccessRate = calculateSuccessRate(this.metrics.text.completionSuccess, this.metrics.text.completionFailure);
        const voiceSuccessRate = calculateSuccessRate(this.metrics.voice.completionSuccess, this.metrics.voice.completionFailure);

        const summary = {
            streamingPerformance: {
                textMode: {
                    avgFirstChunk: calculateAverage(this.metrics.text.firstChunkLatency),
                    successRate: textSuccessRate
                },
                voiceMode: {
                    avgAudioStart: calculateAverage(this.metrics.voice.firstAudioLatency),
                    avgAudioGap: calculateAverage(this.metrics.voice.audioGaps),
                    successRate: voiceSuccessRate
                },
            },
            apiHealth: {
                claude: {
                    avgDuration: calculateAverage(this.metrics.api.claude.map(c => c.duration)),
                    successRate: calculateSuccessRate(
                        this.metrics.api.claude.filter(c => c.success).length,
                        this.metrics.api.claude.filter(c => !c.success).length
                    )
                },
                elevenLabs: {
                    avgDuration: calculateAverage(this.metrics.api.elevenLabs.map(c => c.duration)),
                    successRate: calculateSuccessRate(
                        this.metrics.api.elevenLabs.filter(c => c.success).length,
                        this.metrics.api.elevenLabs.filter(c => !c.success).length
                    )
                }
            },
            // In a real app, this would be a more sophisticated count.
            activeStreams: "N/A", 
            errorRate: "N/A",
        };

        return summary;
    }

}

const instance = new StreamingMetricsService();
module.exports = instance; 