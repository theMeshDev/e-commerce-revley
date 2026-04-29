"use client"

import { useState, useEffect } from "react"
import { fetchSubscriptions, type Subscription } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { statusColor, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function SubscriptionsPage() {
  const { accessToken } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetchSubscriptions(accessToken)
      .then(setSubscriptions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Recurring billing schedules and their current status.
        </p>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>Next Billing</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading subscriptions...
                </TableCell>
              </TableRow>
            )}
            {!loading && subscriptions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No subscriptions found
                </TableCell>
              </TableRow>
            )}
            {!loading && subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-medium font-mono text-xs">
                  {sub.customer_id.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${sub.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColor[sub.status]}
                  >
                    {sub.status.charAt(0).toUpperCase() +
                      sub.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                  {sub.processor}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(sub.next_billing_date)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
