"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { IconLock, IconShoppingBag } from "@tabler/icons-react"

const PRODUCT = {
  name: "Classic Leather Backpack",
  variant: "Black / One Size",
  price: 89.99,
  image: null as string | null,
  qty: 1,
}

const TAX_RATE = 0.08
const SHIPPING = 5.99

type FormErrors = Record<string, string>

function validateForm(form: {
  email: string
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zip: string
  cardNumber: string
  expiry: string
  cvv: string
}): FormErrors {
  const errors: FormErrors = {}
  if (!form.email) errors.email = "Email is required"
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Invalid email"
  if (!form.firstName) errors.firstName = "First name is required"
  if (!form.lastName) errors.lastName = "Last name is required"
  if (!form.address) errors.address = "Address is required"
  if (!form.city) errors.city = "City is required"
  if (!form.state) errors.state = "State is required"
  if (!form.zip) errors.zip = "ZIP code is required"
  if (!form.cardNumber) errors.cardNumber = "Card number is required"
  else if (form.cardNumber.replace(/\s/g, "").length < 16)
    errors.cardNumber = "Invalid card number"
  if (!form.expiry) errors.expiry = "Expiry is required"
  else if (!/^\d{2}\/\d{2}$/.test(form.expiry))
    errors.expiry = "Use MM/YY format"
  if (!form.cvv) errors.cvv = "CVV is required"
  else if (!/^\d{3,4}$/.test(form.cvv)) errors.cvv = "Invalid CVV"
  return errors
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16)
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ")
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4)
  if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2)
  return digits
}

export default function CheckoutPage() {
  const router = useRouter()
  const [isSubscription, setIsSubscription] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  })

  const subtotal = PRODUCT.price * PRODUCT.qty
  const tax = subtotal * TAX_RATE
  const total = subtotal + SHIPPING + tax

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setIsSubmitting(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const response = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          phone: form.phone || undefined,
          firstName: form.firstName,
          lastName: form.lastName,
          address: form.address,
          apartment: form.apartment || undefined,
          city: form.city,
          state: form.state,
          zip: form.zip,
          cardNumber: form.cardNumber.replace(/\s/g, ''),
          expiry: form.expiry,
          cvv: form.cvv,
          isSubscription,
        }),
      })

      if (!response.ok) {
        throw new Error('Checkout failed')
      }

      await response.json()
      router.push("/success")
    } catch (error) {
      console.error('Checkout error:', error)
      setErrors({ submit: 'Checkout failed. Please try again.' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh">
      <div className="mx-auto max-w-[1080px]">
        <form onSubmit={handleSubmit}>
          <div className="flex min-h-svh flex-col lg:flex-row">
            {/* Left Column - Form */}
            <div className="flex-1 px-4 py-8 sm:px-8 lg:pr-12">
              {/* Logo / Store name */}
              <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Checkout
                </h1>
              </div>

              {/* Contact */}
              <section className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact
                </h2>
                <div>
                  <Label htmlFor="email" className="sr-only">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    aria-invalid={!!errors.email}
                    className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div className="mt-3">
                  <Label htmlFor="phone" className="sr-only">
                    Phone (optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone (optional)"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                  />
                </div>
              </section>

              {/* Billing Address */}
              <section className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Billing address
                </h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="sr-only">
                        First name
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={form.firstName}
                        onChange={(e) =>
                          updateField("firstName", e.target.value)
                        }
                        aria-invalid={!!errors.firstName}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="sr-only">
                        Last name
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Last name"
                        value={form.lastName}
                        onChange={(e) =>
                          updateField("lastName", e.target.value)
                        }
                        aria-invalid={!!errors.lastName}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Input
                      placeholder="Address"
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      aria-invalid={!!errors.address}
                      className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.address}
                      </p>
                    )}
                  </div>
                  <div>
                    <Input
                      placeholder="Apartment, suite, etc. (optional)"
                      value={form.apartment}
                      onChange={(e) => updateField("apartment", e.target.value)}
                      className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Input
                        placeholder="City"
                        value={form.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        aria-invalid={!!errors.city}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.city && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.city}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="State"
                        value={form.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        aria-invalid={!!errors.state}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.state && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.state}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        placeholder="ZIP code"
                        value={form.zip}
                        onChange={(e) => updateField("zip", e.target.value)}
                        aria-invalid={!!errors.zip}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.zip && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.zip}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Subscription Option */}
              <section className="mb-8">
                <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
                  <Checkbox
                    id="subscription"
                    checked={isSubscription}
                    onCheckedChange={(checked) =>
                      setIsSubscription(checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="subscription"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Subscribe & Save
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Get this product delivered monthly and save 10% on every
                      order.
                    </p>
                  </div>
                </div>
              </section>

              {/* Payment */}
              <section className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Payment
                </h2>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    All transactions are secure and encrypted.
                  </p>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="cardNumber" className="sr-only">
                        Card number
                      </Label>
                      <Input
                        id="cardNumber"
                        placeholder="Card number"
                        inputMode="numeric"
                        value={form.cardNumber}
                        onChange={(e) =>
                          updateField(
                            "cardNumber",
                            formatCardNumber(e.target.value)
                          )
                        }
                        aria-invalid={!!errors.cardNumber}
                        className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                      />
                      {errors.cardNumber && (
                        <p className="mt-1 text-xs text-destructive">
                          {errors.cardNumber}
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="expiry" className="sr-only">
                          Expiration date
                        </Label>
                        <Input
                          id="expiry"
                          placeholder="MM / YY"
                          inputMode="numeric"
                          value={form.expiry}
                          onChange={(e) =>
                            updateField("expiry", formatExpiry(e.target.value))
                          }
                          aria-invalid={!!errors.expiry}
                          className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                        />
                        {errors.expiry && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.expiry}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="cvv" className="sr-only">
                          Security code
                        </Label>
                        <Input
                          id="cvv"
                          placeholder="CVV"
                          inputMode="numeric"
                          maxLength={4}
                          value={form.cvv}
                          onChange={(e) =>
                            updateField(
                              "cvv",
                              e.target.value.replace(/\D/g, "").slice(0, 4)
                            )
                          }
                          aria-invalid={!!errors.cvv}
                          className="h-11 rounded-lg border-gray-300 bg-white px-3 text-sm"
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-xs text-destructive">
                            {errors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Submit Error */}
              {errors.submit && (
                <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                  {errors.submit}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-lg text-sm font-semibold"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <IconLock className="size-4" />
                    Checkout
                  </span>
                )}
              </Button>

              <p className="mt-4 pb-8 text-center text-xs text-muted-foreground">
                Your payment information is encrypted and secure.
              </p>
            </div>

            {/* Right Column - Order Summary */}
            <div className="border-l border-gray-200 bg-white px-4 py-8 sm:px-8 lg:w-[380px] lg:pl-12">
              <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order summary
              </h2>

              {/* Product */}
              <div className="flex gap-4">
                <div className="relative flex size-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  <IconShoppingBag className="size-6 text-muted-foreground" />
                  <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-muted-foreground text-[10px] font-medium text-white">
                    {PRODUCT.qty}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{PRODUCT.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {PRODUCT.variant}
                  </p>
                  {isSubscription && (
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Monthly subscription
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium">
                  ${PRODUCT.price.toFixed(2)}
                </p>
              </div>

              <Separator className="my-5 bg-gray-200" />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${SHIPPING.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                {isSubscription && (
                  <div className="flex justify-between text-primary">
                    <span>Subscription discount (10%)</span>
                    <span>-${(subtotal * 0.1).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator className="my-5 bg-gray-200" />

              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-lg font-semibold">
                  $
                  {isSubscription
                    ? (total - subtotal * 0.1).toFixed(2)
                    : total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
