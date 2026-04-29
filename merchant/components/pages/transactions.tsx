"use client"

import { useState, useEffect } from "react"
import { fetchTransactions, type Transaction } from "@/lib/api"
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

export function TransactionsPage() {
  const { accessToken } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    fetchTransactions(accessToken)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Transactions</h2>
        <p className="text-sm text-muted-foreground">
          Recent payment activity across all processors.
        </p>
      </div>
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Processor</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Loading transactions...
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium font-mono text-xs">
                  {tx.customer_id.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  ${tx.amount.toFixed(2)}
                </TableCell>
                <TableCell className="capitalize">{tx.type}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={statusColor[tx.state]}
                  >
                    {tx.state.charAt(0).toUpperCase() + tx.state.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">
                  {tx.processor}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(tx.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
