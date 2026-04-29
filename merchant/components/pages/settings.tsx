"use client"

import { useState, useEffect } from "react"
import type { Integration } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth"
import {
  fetchIntegrations,
  updateIntegrationApi,
  fetchCheckoutProcessor,
  updateCheckoutProcessor,
  updateProcessorSplit,
  type CheckoutProcessor,
} from "@/lib/api"
import { statusColor, humanizeKey } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export function SettingsPage() {
  const { accessToken } = useAuth()
  const [integrationsList, setIntegrationsList] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [processor, setProcessor] = useState<string>("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [useSplit, setUseSplit] = useState(false)
  const [stripeSplit, setStripeSplit] = useState(50)
  const [nmiSplit, setNmiSplit] = useState(50)

  useEffect(() => {
    if (!accessToken) return
    Promise.all([
      fetchIntegrations(accessToken),
      fetchCheckoutProcessor(accessToken),
    ])
      .then(([integrations, proc]) => {
        setIntegrationsList(integrations)
        setProcessor(proc)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [accessToken])

  const editing = integrationsList.find((i) => i.id === editingId) ?? null

  function updateIntegration(id: string, updates: Partial<Integration>) {
    setIntegrationsList((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates } : i))
    )
  }

  function updateCredential(id: string, key: string, value: string) {
    setIntegrationsList((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, credentials: { ...i.credentials, [key]: value } }
          : i
      )
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Store Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure payment processors and integration credentials.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Checkout Processor
        </h3>
        <Select
          value={processor}
          onValueChange={async (value: string) => {
            const proc = value as CheckoutProcessor
            setProcessor(proc)
            if (!accessToken) return
            try {
              await updateCheckoutProcessor(accessToken, proc)
            } catch (err) {
              console.error("Failed to update checkout processor:", err)
            }
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="NMI">NMI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Processor Split
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Route checkout traffic across multiple processors by percentage
            </p>
          </div>
          <Switch checked={useSplit} onCheckedChange={setUseSplit} />
        </div>
        {useSplit && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Stripe</Label>
                  <span className="text-sm font-medium">{stripeSplit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stripeSplit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setStripeSplit(val)
                    setNmiSplit(100 - val)
                  }}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>NMI</Label>
                  <span className="text-sm font-medium">{nmiSplit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={nmiSplit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    setNmiSplit(val)
                    setStripeSplit(100 - val)
                  }}
                  className="w-full"
                />
              </div>
              <Button
                className="w-full"
                size="sm"
                onClick={async () => {
                  if (!accessToken) return
                  try {
                    await updateProcessorSplit(accessToken, {
                      stripe: stripeSplit,
                      NMI: nmiSplit,
                    })
                  } catch (err) {
                    console.error("Failed to update processor split:", err)
                  }
                }}
              >
                Save Split Configuration
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Integrations
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {loading && (
            <p className="text-sm text-muted-foreground col-span-3">
              Loading integrations...
            </p>
          )}
          {integrationsList.map((integration) => (
            <Card
              key={integration.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setEditingId(integration.id)}
            >
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize tracking-wide mb-2">
                  {integration.type}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={
                    integration.active
                      ? statusColor.active
                      : statusColor.inactive
                  }
                >
                  {integration.active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(integration.credentials).length} credential
                  {Object.keys(integration.credentials).length !== 1
                    ? "s"
                    : ""}{" "}
                  configured
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Sheet
        open={!!editing}
        onOpenChange={(open) => !open && setEditingId(null)}
      >
        <SheetContent>
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle className="capitalize tracking-wide">
                  {editing.type} Integration
                </SheetTitle>
                <SheetDescription>
                  Manage connection status and API credentials.
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-5 px-4 pb-4">
                <div className="flex items-center justify-between">
                  <Label>Enabled</Label>
                  <Switch
                    checked={editing.active}
                    onCheckedChange={(checked) =>
                      updateIntegration(editing.id, { active: checked })
                    }
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Credentials</h4>
                  {Object.entries(editing.credentials).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {humanizeKey(key)}
                      </Label>
                      <Input
                        value={value}
                        onChange={(e) =>
                          updateCredential(editing.id, key, e.target.value)
                        }
                        placeholder={`Enter ${humanizeKey(key).toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-auto w-full"
                  onClick={async () => {
                    if (!editing || !accessToken) return
                    try {
                      const updated = await updateIntegrationApi(
                        accessToken,
                        editing.id,
                        {
                          status: editing.active ? "active" : "inactive",
                          creds: editing.credentials,
                        },
                      )
                      setIntegrationsList((prev) =>
                        prev.map((i) => (i.id === updated.id ? updated : i)),
                      )
                    } catch (err) {
                      console.error("Failed to save integration:", err)
                    }
                    setEditingId(null)
                  }}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
