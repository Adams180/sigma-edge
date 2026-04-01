"""
Stripe billing integration for Sigma Edge.

Endpoints:
  POST /api/billing/create-checkout  — Create Stripe Checkout session
  POST /api/billing/webhook          — Handle Stripe webhook events
  GET  /api/billing/portal           — Customer billing portal URL
"""

from __future__ import annotations

import logging
import os

import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

log = logging.getLogger(__name__)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

# Price IDs — create these in Stripe Dashboard
PRICE_IDS = {
    "pro": os.environ.get("STRIPE_PRICE_PRO", ""),
    "elite": os.environ.get("STRIPE_PRICE_ELITE", ""),
}

router = APIRouter(prefix="/api/billing")


class CheckoutRequest(BaseModel):
    tier: str           # "pro" | "elite"
    user_id: str        # Supabase user UUID
    email: str
    success_url: str = "https://sigma-edge.vercel.app/settings?upgraded=1"
    cancel_url: str = "https://sigma-edge.vercel.app/settings"


@router.post("/create-checkout")
async def create_checkout(req: CheckoutRequest):
    if req.tier not in PRICE_IDS:
        raise HTTPException(400, "Invalid tier")
    price_id = PRICE_IDS[req.tier]
    if not price_id:
        raise HTTPException(503, f"Stripe price ID for '{req.tier}' not configured")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer_email=req.email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=req.success_url,
        cancel_url=req.cancel_url,
        metadata={"user_id": req.user_id, "tier": req.tier},
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        tier = session["metadata"].get("tier", "pro")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        if user_id:
            _update_user_tier(user_id, tier, customer_id, subscription_id, "active")
            log.info(f"Upgraded user {user_id} to {tier}")

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.paused"):
        sub = event["data"]["object"]
        customer_id = sub.get("customer")
        if customer_id:
            _downgrade_by_customer(customer_id)
            log.info(f"Downgraded customer {customer_id}")

    elif event["type"] == "customer.subscription.updated":
        sub = event["data"]["object"]
        status = sub.get("status")
        customer_id = sub.get("customer")
        if status in ("past_due", "unpaid", "canceled") and customer_id:
            _downgrade_by_customer(customer_id)

    return {"received": True}


@router.post("/portal")
async def billing_portal(user_id: str, return_url: str = "https://sigma-edge.vercel.app/settings"):
    import requests as req_lib
    # Fetch customer_id from Supabase
    resp = req_lib.get(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}&select=stripe_customer_id",
        headers={"apikey": SUPABASE_SERVICE_KEY, "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"},
    )
    data = resp.json()
    if not data or not data[0].get("stripe_customer_id"):
        raise HTTPException(404, "No billing account found")

    session = stripe.billing_portal.Session.create(
        customer=data[0]["stripe_customer_id"],
        return_url=return_url,
    )
    return {"url": session.url}


def _update_user_tier(user_id, tier, customer_id, subscription_id, status):
    import requests as req_lib
    req_lib.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={
            "tier": tier,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "subscription_status": status,
        },
    )


def _downgrade_by_customer(customer_id):
    import requests as req_lib
    req_lib.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.{customer_id}",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={"tier": "free", "subscription_status": "inactive"},
    )
