# Scaling Design: Handling High-Traffic Payment Processing

## Problem Statement

During high-traffic events (sales, holidays, product launches), the current system faces two critical challenges:

1. **Rate Limiting**: Payment processors (Stripe, NMI) impose rate limits that can be exceeded during traffic spikes
2. **System Bottlenecks**: Synchronous checkout processing creates latency and potential failures under load

## Proposed Architecture

### 1. Async Job Queue with Retry Logic

**Current Flow** (Synchronous):
```
Customer → API → Payment Processor → Database → Response
         (blocks waiting for processor)
```

**Improved Flow** (Asynchronous):
```
Customer → API → Job Queue → Response (202 Accepted)
                    ↓
            Background Workers → Payment Processor
                    ↓
            Webhooks → Update Transaction Status
```

**Implementation**:
- Use **Redis + Bull Queue** or **AWS SQS** for job queueing
- Accept checkout requests immediately (202 Accepted)
- Process payments asynchronously with configurable concurrency limits
- Implement exponential backoff retry logic for rate limit errors

**Benefits**:
- Customer gets instant feedback (job queued successfully)
- System can buffer requests during spikes
- Failed jobs automatically retry
- Horizontal scaling of worker processes

### 2. Intelligent Rate Limiting & Circuit Breaker

**Processor-Aware Rate Limiter**:
```typescript
// Per-processor rate limits
const RATE_LIMITS = {
  stripe: { requestsPerSecond: 100, burst: 200 },
  NMI: { requestsPerSecond: 50, burst: 100 }
}

// Token bucket algorithm implementation
class ProcessorRateLimiter {
  async acquireToken(processor: string): Promise<boolean> {
    // Check if tokens available
    // If not, queue or delay request
  }
}
```

**Circuit Breaker Pattern**:
```
States: CLOSED → OPEN → HALF_OPEN
- CLOSED: Normal operation
- OPEN: Stop sending requests after X failures (prevents cascade)
- HALF_OPEN: Allow limited traffic to test recovery
```

**Benefits**:
- Prevents overwhelming processors during incidents
- Automatic recovery when processors stabilize
- Graceful degradation instead of total failure

### 3. Read Replicas & Caching Layer

**Database Optimization**:
- **Write Master** for transactions, subscriptions
- **Read Replicas** for merchant dashboard queries
- Separation prevents heavy reads from blocking writes

**Redis Caching Strategy**:
```typescript
// Cache merchant transaction summaries
cache.set(`merchant:${storeId}:txn:summary`, data, TTL_5MIN)

// Cache subscription billing schedules
cache.set(`subscription:${subId}:next_charge`, timestamp, TTL_1HOUR)

// Invalidate on writes
on('transaction.completed', (txn) => {
  cache.del(`merchant:${txn.storeId}:txn:summary`)
})
```

**Benefits**:
- Reduces database load by 70-80%
- Faster merchant dashboard loading
- Allows aggressive scaling of read traffic

### 4. Processor Split with Priority Queues

**Current**: Random weighted selection per request

**Improved**: Priority-based routing with dynamic adjustment

```typescript
// Priority queues per processor
const queues = {
  stripe: new PriorityQueue(),
  NMI: new PriorityQueue()
}

// Dynamic rebalancing based on health
if (stripe.errorRate > 0.05) {
  // Shift 20% traffic to NMI temporarily
  adjustSplit({ stripe: 50, NMI: 50 })
}

// VIP customer priority
if (customer.tier === 'VIP') {
  queues[processor].enqueue(job, HIGH_PRIORITY)
}
```

**Benefits**:
- Automatic failover during processor degradation
- Business-critical transactions prioritized
- Better utilization across processors

### 5. Event-Driven Architecture

**Decouple Components**:
```
Checkout Service → Kafka/EventBridge → [
  Payment Processing Service
  Analytics Service
  Notification Service
  Fraud Detection Service
]
```

**Event Types**:
- `checkout.initiated`
- `payment.processing`
- `payment.succeeded`
- `payment.failed`
- `subscription.created`
- `subscription.billing_due`

**Benefits**:
- Independent scaling of services
- Add new features without modifying core checkout
- Better fault isolation
- Audit trail of all events

## Scaling Numbers (Projected)

| Metric | Current | With Improvements |
|--------|---------|-------------------|
| Checkout latency (p95) | 2.5s | 150ms (async) |
| Max concurrent checkouts | ~100/s | ~10,000/s |
| Database read load | High | -75% (caching) |
| Processor error rate | 5-10% (spikes) | <1% (buffering) |
| Worker horizontal scaling | N/A | Elastic (10-100 workers) |

## Infrastructure Recommendations

### Immediate (0-3 months):
1. **Redis** for job queue + caching
2. **PostgreSQL read replicas** (2-3 replicas)
3. **Background workers** (Bull/BullMQ with Redis)
4. **Circuit breakers** for processor calls
5. **Per-processor rate limiting**

### Medium-term (3-6 months):
1. **Kafka/AWS EventBridge** for event streaming
2. **Separate microservices** (checkout, billing, notifications)
3. **Auto-scaling workers** based on queue depth
4. **CDN** for static merchant dashboard assets
5. **Database connection pooling** (PgBouncer)

### Long-term (6-12 months):
1. **Multi-region deployment** for global customers
2. **Data partitioning** by store_id (sharding)
3. **Real-time analytics** on payment events
4. **ML-based fraud detection** pipeline
5. **Dedicated billing service** with SLA guarantees

## Cost-Benefit Analysis

**Additional Infrastructure Costs** (monthly):
- Redis (ElastiCache): ~$50-100
- Read replicas (2x): ~$200
- EventBridge/SQS: ~$20-50
- Worker instances (5x): ~$250

**Total**: ~$520-600/month

**Benefits**:
- Support 100x more traffic
- Reduce processor errors by 80%
- Improve customer checkout success rate from ~90% to ~99%
- Enable merchant self-service during high-load events

**ROI**: For a business processing $1M+ monthly, a 9% improvement in checkout success = $90K+ additional revenue, far exceeding infrastructure costs.

## Monitoring & Observability

**Key Metrics**:
```
- checkout.queue_depth (alert > 1000)
- checkout.processing_time_p95 (alert > 5s)
- processor.{stripe,NMI}.error_rate (alert > 2%)
- processor.{stripe,NMI}.rate_limit_hits (alert > 10/min)
- database.replica_lag (alert > 5s)
- cache.hit_rate (alert < 70%)
```

**Alerting Strategy**:
- **Critical**: Circuit breaker OPEN, queue depth > 5000
- **Warning**: Error rate > 2%, cache hit rate < 70%
- **Info**: Rate limit hits, slow queries

## Conclusion

This design prioritizes **resilience, scalability, and gradual implementation**. The async job queue + rate limiting provides immediate value with minimal complexity, while the event-driven architecture enables long-term growth. Each component can be implemented incrementally without a full rewrite, allowing continuous delivery of value while managing technical risk.
