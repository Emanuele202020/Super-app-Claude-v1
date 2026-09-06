/* =========================================================================
   DailyHub — Super App research mockup
   Vanilla JS only. No build step, no dependencies.

   FILE MAP
   1. Icons (inline SVG, dependency-free)
   2. Treatment configuration + condition resolution (URL param / persisted)
   3. Service + feature + micro-action content (research content lives here)
   4. Tracking / paradata state
   5. Result renderers (turns a micro-action into a small simulated result)
   6. Screen + navigation helpers
   7. Onboarding controller
   8. Event wiring
   ========================================================================= */

/* -------------------------------------------------------------------------
   1. ICONS
   Minimal stroke-based SVGs so nothing depends on an external icon font
   or CDN (GitHub Pages has no server, so a failed CDN request would just
   leave blank squares). Every icon is decorative; the visible label next
   to it always carries the meaning.
   ------------------------------------------------------------------------- */
const ICONS = {
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"></rect><path d="M3 10h18"></path><circle cx="16.5" cy="14" r="1.3" fill="currentColor" stroke="none"></circle><path d="M7 6V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1"></path></svg>',
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1 12.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.5L6 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2v7a2 2 0 0 0 4 0V2"></path><path d="M8 9v13"></path><path d="M17 2c-1.7 1-2.6 3.1-2.6 5.6S15.3 12 17 13v9"></path></svg>',
  transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 4 21l8-4 8 4L12 2Z"></path></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path><path d="M14 2v5h5"></path><path d="M8 13h8M8 17h8M8 9h3"></path></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z"></path></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"></path></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg>'
};

/* -------------------------------------------------------------------------
   2. TREATMENT CONFIGURATION + CONDITION RESOLUTION
   ------------------------------------------------------------------------- */
const treatmentOptions = {
  convenience: {
    condition: "convenience_value",
    chip: "Convenience / Value",
    icon: "bolt",
    title: "Manage your daily life faster",
    text: "One connected app for payments, shopping, food, mobility, and public services — designed to save you time, cut out repetitive steps, and make everyday tasks quicker and easier."
  },
  privacy: {
    condition: "privacy_control",
    chip: "Privacy / Control",
    icon: "shield",
    title: "Stay in control of your data",
    text: "One connected app for payments, shopping, food, mobility, and public services — designed to give you clear visibility and control over your data, permissions, and privacy settings."
  }
};

const VALID_CONDITIONS = ["convenience_value", "privacy_control"];
const CONDITION_STORAGE_KEY = "dailyhub_condition";

/**
 * Resolves which experimental condition this participant sees, and makes
 * sure the choice survives a page refresh.
 *
 * Order of precedence:
 *   1. An explicit ?condition=convenience_value|privacy_control URL param
 *      (useful for testing and for a future Qualtrics redirect). If present
 *      and valid, it is used AND (re)saved, so it also becomes the value
 *      used on subsequent refreshes without the param.
 *   2. A condition already stored earlier in this browser tab/session
 *      (sessionStorage) — this is what makes "refresh mid-session" safe:
 *      the participant cannot flip from one condition to the other by
 *      reloading the page.
 *   3. Otherwise, a fresh ~50/50 random assignment, which is then stored
 *      for the rest of the session.
 *
 * sessionStorage (not localStorage) is used deliberately: it is cleared
 * when the tab is closed, so a new participant opening the link later in
 * the same browser still gets an independent random assignment, while a
 * refresh *within* one participant's session is fully stable.
 */
function resolveCondition() {
  const params = new URLSearchParams(window.location.search);
  const paramCondition = params.get("condition");

  if (paramCondition && VALID_CONDITIONS.includes(paramCondition)) {
    try { sessionStorage.setItem(CONDITION_STORAGE_KEY, paramCondition); } catch (err) { /* storage unavailable */ }
    return paramCondition;
  }

  try {
    const stored = sessionStorage.getItem(CONDITION_STORAGE_KEY);
    if (stored && VALID_CONDITIONS.includes(stored)) {
      return stored;
    }
  } catch (err) { /* storage unavailable */ }

  const assigned = Math.random() < 0.5 ? "convenience_value" : "privacy_control";
  try { sessionStorage.setItem(CONDITION_STORAGE_KEY, assigned); } catch (err) { /* storage unavailable */ }
  return assigned;
}

/* -------------------------------------------------------------------------
   3. SERVICES, FEATURES, MICRO-ACTIONS
   Every micro-action carries a "result" object used only for the small
   simulated feedback panel shown when it is clicked. The tracked label
   text (used in micro_action_sequence) is unchanged by this — it is the
   same human-readable phrase as before, so paradata stays comparable.
   ------------------------------------------------------------------------- */
const SERVICE_ORDER = ["banking", "shopping", "delivery", "mobility", "public"];

const services = {
  banking: {
    icon: "wallet",
    title: "Banking & Payments",
    shortDescription: "Wallet, bills, transfers, spending insights",
    description: "A secure financial area where users could manage payments, bills, transfers, spending insights, and connected accounts.",
    value: "Fast payments, fewer banking steps, and an integrated financial overview.",
    data: "Payment account, identity verification, transaction history.",
    features: [
      {
        id: "wallet_overview",
        title: "Wallet overview",
        description: "View cards, balance, recent transactions, and linked payment methods.",
        userValue: "Helps users understand their financial situation quickly.",
        requiredData: "Cards, balance, recent payments.",
        actions: [
          { label: "Check wallet balance", result: { type: "stat", label: "Available balance", value: "€1,284.50", sub: "Main account · updated just now" } },
          { label: "Review last transaction", result: { type: "list", items: [ { title: "Grocery Market", meta: "-€23.40 · Today" }, { title: "Salary deposit", meta: "+€1,650.00 · Yesterday" } ] } },
          { label: "Set spending limit", result: { type: "confirm", message: "Monthly limit set", detail: "€600 / month for card ••4471" } }
        ]
      },
      {
        id: "pay_bills",
        title: "Pay bills",
        description: "Pay utilities, subscriptions, public fees, or invoices from one place.",
        userValue: "Reduces effort by centralizing recurring payments.",
        requiredData: "Invoice details, payment account.",
        actions: [
          { label: "Preview bill payment", result: { type: "notice", title: "Electricity bill", date: "Due 28 Aug", body: "Amount due: €58.20 · Provider: City Energy Co." } },
          { label: "Schedule payment", result: { type: "confirm", message: "Payment scheduled", detail: "€58.20 will be paid on 27 Aug" } },
          { label: "Save bill provider", result: { type: "confirm", message: "Provider saved", detail: "City Energy Co. added to your billers" } }
        ]
      },
      {
        id: "send_money",
        title: "Send money",
        description: "Transfer money to contacts or businesses using saved recipients.",
        userValue: "Makes peer-to-peer and service payments faster.",
        requiredData: "Recipient data, payment method.",
        actions: [
          { label: "Choose recipient", result: { type: "list", items: [ { title: "Alex M.", meta: "Recent recipient" }, { title: "Giulia R.", meta: "Recent recipient" } ] } },
          { label: "Enter amount", result: { type: "stat", label: "Amount", value: "€45.00", sub: "Transfer to Alex M." } },
          { label: "Confirm transfer preview", result: { type: "confirm", message: "Transfer ready to confirm", detail: "€45.00 to Alex M. · Arrives instantly" } }
        ]
      },
      {
        id: "spending_insights",
        title: "Spending insights",
        description: "See spending categories across shopping, delivery, mobility, and payments.",
        userValue: "Creates value through financial awareness and personalization.",
        requiredData: "Transaction history and category data.",
        actions: [
          { label: "View monthly chart", result: { type: "chart", bars: [ { label: "Shopping", value: "€210" }, { label: "Food", value: "€165" }, { label: "Mobility", value: "€90" }, { label: "Bills", value: "€140" } ] } },
          { label: "Compare categories", result: { type: "list", items: [ { title: "Shopping", meta: "34% of spending" }, { title: "Food", meta: "27% of spending" } ] } },
          { label: "Create budget alert", result: { type: "confirm", message: "Budget alert created", detail: "You'll be notified above €250 in Shopping" } }
        ]
      }
    ]
  },

  shopping: {
    icon: "bag",
    title: "Shopping",
    shortDescription: "Deals, orders, rewards, recommendations",
    description: "A commerce area where users could browse products, compare offers, track orders, and collect rewards.",
    value: "Integrated shopping, order tracking, and personalized offers.",
    data: "Purchase history, preferences, delivery address.",
    features: [
      {
        id: "deals_rewards",
        title: "Deals & rewards",
        description: "Browse personalized deals, coupons, and loyalty rewards.",
        userValue: "Creates economic value through discounts and loyalty benefits.",
        requiredData: "Purchase preferences and reward profile.",
        actions: [
          { label: "View daily deals", result: { type: "list", items: [ { title: "20% off electronics", meta: "Ends tonight" }, { title: "Free delivery over €30", meta: "Selected stores" } ] } },
          { label: "Activate reward", result: { type: "confirm", message: "Reward activated", detail: "€5 credit added to your account" } },
          { label: "Save coupon", result: { type: "confirm", message: "Coupon saved", detail: "10% off · valid for 7 days" } }
        ]
      },
      {
        id: "order_tracking",
        title: "Order tracking",
        description: "Track shopping, grocery, and delivery orders in one timeline.",
        userValue: "Reduces fragmentation across different retailer apps.",
        requiredData: "Order IDs and delivery status.",
        actions: [
          { label: "Track latest order", result: { type: "timeline", steps: [ { label: "Order placed", time: "Mon 09:12", state: "done" }, { label: "Shipped", time: "Mon 15:40", state: "done" }, { label: "Out for delivery", time: "Today", state: "current" }, { label: "Delivered", time: "Expected today", state: "upcoming" } ] } },
          { label: "Open delivery timeline", result: { type: "timeline", steps: [ { label: "Preparing", state: "done" }, { label: "Dispatched", state: "current" }, { label: "Arriving", state: "upcoming" } ] } },
          { label: "Request notification", result: { type: "confirm", message: "Notification enabled", detail: "We'll alert you when your order arrives" } }
        ]
      },
      {
        id: "compare_prices",
        title: "Compare prices",
        description: "Compare similar products across connected stores.",
        userValue: "Helps users identify better value before buying.",
        requiredData: "Product search and retailer data.",
        actions: [
          { label: "Compare selected product", result: { type: "compare", options: [ { label: "Store A", meta: "€49.99 · 2-day delivery" }, { label: "Store B", meta: "€52.50 · next-day delivery", tag: "Fastest" }, { label: "Store C", meta: "€47.20 · 4-day delivery", tag: "Cheapest" } ] } },
          { label: "Filter by price", result: { type: "confirm", message: "Filter applied", detail: "Showing results under €50" } },
          { label: "Save comparison", result: { type: "confirm", message: "Comparison saved", detail: "Find it later in Saved items" } }
        ]
      },
      {
        id: "recommendations",
        title: "Recommendations",
        description: "Receive suggestions based on previous purchases and preferences.",
        userValue: "Improves convenience but may raise data-sharing concerns.",
        requiredData: "Purchase history and browsing behavior.",
        actions: [
          { label: "View recommendations", result: { type: "list", items: [ { title: "Wireless earbuds", meta: "Based on recent purchases" }, { title: "Running shoes", meta: "Popular in your area" } ] } },
          { label: "Hide one suggestion", result: { type: "confirm", message: "Suggestion hidden", detail: "You'll see fewer items like this" } },
          { label: "Adjust preferences", result: { type: "confirm", message: "Preferences updated", detail: "Recommendations will refresh next visit" } }
        ]
      }
    ]
  },

  delivery: {
    icon: "food",
    title: "Food & Grocery",
    shortDescription: "Restaurants, groceries, delivery scheduling",
    description: "A delivery area where users could order meals, groceries, and repeat frequent purchases.",
    value: "Faster ordering, saved addresses, and integrated payments.",
    data: "Address, food preferences, payment method.",
    features: [
      {
        id: "restaurant_discovery",
        title: "Restaurant discovery",
        description: "Find restaurants nearby and filter by delivery time, rating, or cuisine.",
        userValue: "Saves time when deciding what to order.",
        requiredData: "Location and food preferences.",
        actions: [
          { label: "Filter by delivery time", result: { type: "compare", options: [ { label: "Under 20 min", meta: "12 restaurants" }, { label: "20–40 min", meta: "27 restaurants" } ] } },
          { label: "Sort by rating", result: { type: "list", items: [ { title: "Trattoria Bella", meta: "4.8 ★ · 25 min" }, { title: "Sushi Now", meta: "4.6 ★ · 30 min" } ] } },
          { label: "Save restaurant", result: { type: "confirm", message: "Restaurant saved", detail: "Trattoria Bella added to Favorites" } }
        ]
      },
      {
        id: "grocery_list",
        title: "Grocery list",
        description: "Build a recurring grocery basket and reorder frequently purchased items.",
        userValue: "Improves efficiency for repetitive purchases.",
        requiredData: "Shopping history and delivery address.",
        actions: [
          { label: "Add item", result: { type: "confirm", message: "Item added", detail: "Whole milk · 1L added to your list" } },
          { label: "Repeat last grocery order", result: { type: "list", items: [ { title: "Weekly essentials", meta: "14 items · €42.30" } ] } },
          { label: "Schedule weekly basket", result: { type: "confirm", message: "Weekly basket scheduled", detail: "Delivered every Friday at 18:00" } }
        ]
      },
      {
        id: "scheduled_delivery",
        title: "Scheduled delivery",
        description: "Choose delivery windows across food, groceries, and packages.",
        userValue: "Gives users more control over timing.",
        requiredData: "Address, availability, delivery preferences.",
        actions: [
          { label: "Choose time slot", result: { type: "slots", items: [ { day: "Today", time: "18:00–19:00" }, { day: "Today", time: "19:00–20:00" }, { day: "Tomorrow", time: "09:00–10:00" } ], note: "Suggested: Today 18:00–19:00" } },
          { label: "Change delivery address", result: { type: "confirm", message: "Address updated", detail: "Delivering to Via Roma 12" } },
          { label: "Enable reminder", result: { type: "confirm", message: "Reminder enabled", detail: "We'll notify you 30 minutes before delivery" } }
        ]
      },
      {
        id: "group_order",
        title: "Group order",
        description: "Create a shared order with friends, family, or colleagues.",
        userValue: "Adds social convenience but requires contact sharing.",
        requiredData: "Contacts and payment split preferences.",
        actions: [
          { label: "Start group order", result: { type: "confirm", message: "Group order started", detail: "Share the code DHUB482 with others" } },
          { label: "Invite contact", result: { type: "list", items: [ { title: "Marco B.", meta: "Invited" }, { title: "Sara T.", meta: "Invited" } ] } },
          { label: "Split payment preview", result: { type: "stat", label: "Your share", value: "€12.40", sub: "Split evenly between 3 people" } }
        ]
      }
    ]
  },

  mobility: {
    icon: "transport",
    title: "Mobility & Transport",
    shortDescription: "Routes, tickets, car sharing, parking",
    description: "A mobility area where users could plan routes, book transport, pay tickets, and access car sharing.",
    value: "Integrated planning, booking, and payment for urban mobility.",
    data: "Location, payment account, travel preferences.",
    features: [
      {
        id: "route_planner",
        title: "Route planner",
        description: "Compare walking, public transport, ride-hailing, and car sharing routes.",
        userValue: "Helps users choose the fastest or cheapest option.",
        requiredData: "Location and destination.",
        actions: [
          { label: "Compare routes", result: { type: "compare", options: [ { label: "Walking", meta: "18 min · Free" }, { label: "Public transport", meta: "9 min · €1.50", tag: "Fastest" }, { label: "Car sharing", meta: "7 min · €4.20" } ] } },
          { label: "Choose fastest option", result: { type: "confirm", message: "Route selected", detail: "Public transport · 9 min · €1.50" } },
          { label: "Save frequent route", result: { type: "confirm", message: "Route saved", detail: "Home → Office added to Frequent routes" } }
        ]
      },
      {
        id: "public_tickets",
        title: "Public transport tickets",
        description: "Buy and store tickets for public transport directly in the app.",
        userValue: "Reduces the need for separate transport apps.",
        requiredData: "Location, route, payment method.",
        actions: [
          { label: "Buy ticket preview", result: { type: "ticket", title: "Single ride ticket", meta1: "Valid 90 minutes", meta2: "€1.50", code: "TCK-2291" } },
          { label: "Save ticket", result: { type: "confirm", message: "Ticket saved", detail: "Available offline in your wallet" } },
          { label: "Enable trip reminder", result: { type: "confirm", message: "Reminder enabled", detail: "We'll notify you before your ticket expires" } }
        ]
      },
      {
        id: "car_sharing",
        title: "Car sharing",
        description: "Find nearby shared cars and reserve them from the same interface.",
        userValue: "Makes occasional mobility easier and more flexible.",
        requiredData: "Location, driving eligibility, payment method.",
        actions: [
          { label: "Find nearby car", result: { type: "list", items: [ { title: "Compact car", meta: "2 min walk · €0.28/min" }, { title: "City car", meta: "5 min walk · €0.24/min" } ] } },
          { label: "Reserve preview", result: { type: "confirm", message: "Reservation held", detail: "Compact car reserved for 15 minutes" } },
          { label: "View vehicle details", result: { type: "stat", label: "Fuel level", value: "78%", sub: "Compact car · Plate EA 213 XZ" } }
        ]
      },
      {
        id: "parking",
        title: "Parking",
        description: "Find parking areas, check prices, and pay parking fees.",
        userValue: "Improves convenience for urban travel.",
        requiredData: "Location and payment method.",
        actions: [
          { label: "Find parking", result: { type: "list", items: [ { title: "Central Garage", meta: "3 min walk · €2.10/hr" }, { title: "Station Lot", meta: "7 min walk · €1.60/hr" } ] } },
          { label: "Compare price", result: { type: "compare", options: [ { label: "Central Garage", meta: "€2.10/hr" }, { label: "Station Lot", meta: "€1.60/hr", tag: "Cheapest" } ] } },
          { label: "Pay parking preview", result: { type: "stat", label: "Amount due", value: "€3.20", sub: "2 hours · Central Garage" } }
        ]
      }
    ]
  },

  public: {
    icon: "doc",
    title: "Public Services",
    shortDescription: "Documents, notices, appointments, payments",
    description: "A public service area where users could manage digital documents, public notices, appointments, and payments.",
    value: "One access point for useful administrative tasks.",
    data: "Identity, documents, residence information, public service records.",
    features: [
      {
        id: "digital_documents",
        title: "Digital documents",
        description: "Access identity-related documents, certificates, and service records.",
        userValue: "Reduces administrative fragmentation.",
        requiredData: "Identity verification and public records.",
        actions: [
          { label: "View document wallet", result: { type: "list", items: [ { title: "ID card copy", meta: "Valid" }, { title: "Proof of residence", meta: "Issued 2024" } ] } },
          { label: "Open certificate preview", result: { type: "notice", title: "Residence certificate", date: "Issued 03 Jan 2026", body: "Digital copy ready to download." } },
          { label: "Request update", result: { type: "confirm", message: "Update requested", detail: "Your request has been submitted" } }
        ]
      },
      {
        id: "public_notices",
        title: "Public notices",
        description: "Receive official communications, reminders, and deadlines.",
        userValue: "Helps users avoid missing important public information.",
        requiredData: "Residence and public service subscriptions.",
        actions: [
          { label: "Open latest notice", result: { type: "notice", title: "Waste collection change", date: "Today", body: "Collection schedule changes starting next Monday." } },
          { label: "Set reminder", result: { type: "confirm", message: "Reminder set", detail: "We'll remind you one day before" } },
          { label: "Mark as read", result: { type: "confirm", message: "Marked as read", detail: "Moved to your notice archive" } }
        ]
      },
      {
        id: "appointments",
        title: "Appointments",
        description: "Book appointments with public offices or local services.",
        userValue: "Saves time by centralizing booking and reminders.",
        requiredData: "Identity, location, availability.",
        actions: [
          { label: "Choose office", result: { type: "list", items: [ { title: "City Registry Office", meta: "1.2 km away" }, { title: "District Office North", meta: "3.4 km away" } ] } },
          { label: "Select time slot", result: { type: "slots", items: [ { day: "Thu", time: "10:00" }, { day: "Thu", time: "11:30" }, { day: "Fri", time: "09:00" } ], note: "Suggested: Thu 10:00" } },
          { label: "Save appointment", result: { type: "confirm", message: "Appointment saved", detail: "Thu 10:00 · City Registry Office" } }
        ]
      },
      {
        id: "public_payments",
        title: "Public payments",
        description: "Pay taxes, fines, fees, or public service invoices.",
        userValue: "Combines public services and payments in one flow.",
        requiredData: "Invoice data, identity, payment method.",
        actions: [
          { label: "Preview fee payment", result: { type: "stat", label: "Amount due", value: "€35.00", sub: "Municipal fee · due 15 Sep" } },
          { label: "Save receipt", result: { type: "confirm", message: "Receipt saved", detail: "Available in Documents" } },
          { label: "Set payment reminder", result: { type: "confirm", message: "Reminder set", detail: "We'll remind you 3 days before the due date" } }
        ]
      }
    ]
  }
};

/* Which services use each Data Center permission — shown as small tags
   so participants can see, at a glance, what a permission actually
   touches (Data Center content and behavior is identical across both
   treatment conditions). */
const PERMISSION_META = {
  payment_data: {
    title: "Payment data",
    description: "Used for wallet, bills, transfers, and mobility or public-service payments.",
    usedBy: ["Banking", "Shopping", "Mobility", "Public Services"]
  },
  location_data: {
    title: "Location data",
    description: "Used for route planning, delivery, and nearby public services.",
    usedBy: ["Mobility", "Food & Grocery", "Public Services"]
  },
  document_data: {
    title: "Personal documents",
    description: "Used for identity verification, certificates, and appointments.",
    usedBy: ["Public Services", "Banking"]
  },
  personalization_data: {
    title: "Personalization",
    description: "Used to suggest services, discounts, and faster shortcuts.",
    usedBy: ["Shopping", "Food & Grocery", "Banking"]
  }
};
const PERMISSION_ORDER = ["payment_data", "location_data", "document_data", "personalization_data"];

/* -------------------------------------------------------------------------
   4. TRACKING / PARADATA STATE
   All original variables are preserved with their original meaning.
   Two additions, both scoped to onboarding only (see file header / the
   implementation note delivered alongside this file):
     - onboarding_completed (boolean)
     - onboarding_time_sec (number)
   ------------------------------------------------------------------------- */
const tracking = {
  treatment_condition: null,
  mockup_start_time_iso: null,
  first_click_service: null,
  time_to_first_click_sec: null,
  service_click_sequence: [],
  feature_click_sequence: [],
  micro_action_sequence: [],
  total_clicks: 0,
  services_clicked_count: 0,
  features_clicked_count: 0,
  total_time_on_mockup_sec: 0,
  privacy_info_clicked: false,
  permission_toggles_count: 0,
  banking_clicked: false,
  shopping_clicked: false,
  delivery_clicked: false,
  mobility_clicked: false,
  public_services_clicked: false,
  last_screen: "home",
  onboarding_completed: false,
  onboarding_time_sec: null
};

let treatment;
let mockupStartTime = null;
let currentServiceKey = null;
let currentFeatureId = null;
const clickedServices = new Set();
const clickedFeatures = new Set();

/* -------------------------------------------------------------------------
   5. RESULT RENDERERS
   Turns one micro-action's "result" data into a small HTML fragment.
   Deliberately lightweight — the goal is a believable simulated reaction,
   not a functioning feature (see project brief, "micro-actions" section).
   ------------------------------------------------------------------------- */
function renderResult(result) {
  switch (result.type) {
    case "stat":
      return `<div class="result-card result-stat">
        <span class="result-value">${result.value}</span>
        <span class="result-label">${result.label}</span>
        ${result.sub ? `<span class="result-sub">${result.sub}</span>` : ""}
      </div>`;

    case "list":
      return `<div class="result-card">
        <ul class="result-list">
          ${result.items.map(i => `<li><span>${i.title}</span><small>${i.meta}</small></li>`).join("")}
        </ul>
      </div>`;

    case "timeline":
      return `<div class="result-card">
        <ol class="result-timeline">
          ${result.steps.map(s => `<li class="tl-${s.state}"><span class="tl-dot" aria-hidden="true"></span><div><strong>${s.label}</strong>${s.time ? `<small>${s.time}</small>` : ""}</div></li>`).join("")}
        </ol>
      </div>`;

    case "compare":
      return `<div class="result-card">
        <div class="result-compare">
          ${result.options.map(o => `<div class="compare-option">${o.tag ? `<span class="compare-tag">${o.tag}</span>` : ""}<strong>${o.label}</strong><small>${o.meta}</small></div>`).join("")}
        </div>
      </div>`;

    case "ticket":
      return `<div class="result-card result-ticket">
        <p class="ticket-title">${result.title}</p>
        <div class="ticket-row"><span>${result.meta1}</span><span>${result.meta2}</span></div>
        <p class="ticket-code">${result.code}</p>
      </div>`;

    case "notice":
      return `<div class="result-card result-notice">
        <div class="notice-head"><strong>${result.title}</strong><small>${result.date}</small></div>
        <p>${result.body}</p>
      </div>`;

    case "slots":
      return `<div class="result-card">
        <div class="result-slots">
          ${result.items.map((s, i) => `<span class="slot-chip${i === 0 ? " suggested" : ""}">${s.day} · ${s.time}</span>`).join("")}
        </div>
        ${result.note ? `<p class="result-footer">${result.note}</p>` : ""}
      </div>`;

    case "chart": {
      const numbers = result.bars.map(b => parseFloat(String(b.value).replace(/[^0-9.]/g, "")) || 0);
      const max = Math.max(...numbers, 1);
      return `<div class="result-card">
        <div class="result-chart">
          ${result.bars.map((b, i) => {
            const pct = Math.round((numbers[i] / max) * 100);
            return `<div class="chart-row"><span class="chart-label">${b.label}</span><div class="chart-bar-track"><div class="chart-bar" style="width:${pct}%"></div></div><span class="chart-value">${b.value}</span></div>`;
          }).join("")}
        </div>
      </div>`;
    }

    case "confirm":
    default:
      return `<div class="result-card result-confirm">
        <span class="confirm-check" aria-hidden="true">${ICONS.check}</span>
        <div><strong>${result.message}</strong>${result.detail ? `<small>${result.detail}</small>` : ""}</div>
      </div>`;
  }
}

/* -------------------------------------------------------------------------
   6. SCREEN + NAVIGATION HELPERS
   ------------------------------------------------------------------------- */
const screens = {};
let crumbEl, crumbTextEl, trackingOutput;

function cacheDom() {
  screens.home = document.getElementById("home-screen");
  screens.detail = document.getElementById("detail-screen");
  screens.action = document.getElementById("action-screen");
  screens.privacy = document.getElementById("privacy-screen");
  screens.completed = document.getElementById("completion-screen");

  crumbEl = document.getElementById("crumb");
  crumbTextEl = document.getElementById("crumb-text");
  trackingOutput = document.getElementById("tracking-output");
}

function setCrumb(text) {
  if (!text) {
    crumbEl.classList.add("hidden");
    return;
  }
  crumbEl.classList.remove("hidden");
  crumbTextEl.textContent = text;
}

function showScreen(screenName) {
  Object.values(screens).forEach(el => el.classList.add("hidden"));
  if (screens[screenName]) {
    screens[screenName].classList.remove("hidden");
  }
  tracking.last_screen = screenName;
  updateTrackingPreview();
}

function recordBaseClick() {
  tracking.total_clicks += 1;
}

function renderServiceGrid() {
  const grid = document.getElementById("service-grid");
  grid.innerHTML = SERVICE_ORDER.map(key => {
    const s = services[key];
    return `
      <button class="service-card" data-service="${key}">
        <span class="service-icon icon-${key}">${ICONS[s.icon]}</span>
        <span class="service-copy">
          <strong>${s.title}</strong>
          <small>${s.shortDescription}</small>
        </span>
        <span class="service-chevron" aria-hidden="true">${ICONS.chevron}</span>
      </button>
    `;
  }).join("");
}

function recordServiceClick(serviceKey) {
  const now = Date.now();

  recordBaseClick();

  if (!tracking.first_click_service) {
    tracking.first_click_service = serviceKey;
    tracking.time_to_first_click_sec = Number(((now - mockupStartTime) / 1000).toFixed(2));
  }

  tracking.service_click_sequence.push(serviceKey);
  clickedServices.add(serviceKey);
  tracking.services_clicked_count = clickedServices.size;
  tracking[`${serviceKey}_clicked`] = true;

  currentServiceKey = serviceKey;
  currentFeatureId = null;

  showServiceDetail(serviceKey);
  updateTrackingPreview();
}

function showServiceDetail(serviceKey) {
  const service = services[serviceKey];

  document.getElementById("action-back-label").textContent = service.title;

  const serviceDetail = document.getElementById("service-detail");
  serviceDetail.innerHTML = `
    <p class="eyebrow">Service area</p>
    <h2>${service.title}</h2>
    <p>${service.description}</p>
    <div class="info-grid">
      <div class="info-box"><strong>User value</strong><span>${service.value}</span></div>
      <div class="info-box"><strong>Data involved</strong><span>${service.data}</span></div>
    </div>
  `;

  const featureGrid = document.getElementById("feature-grid");
  featureGrid.innerHTML = service.features.map((feature, index) => `
    <button class="feature-card" data-feature="${feature.id}">
      <span class="feature-number">${index + 1}</span>
      <div>
        <strong>${feature.title}</strong>
        <small>${feature.description}</small>
      </div>
      <span class="service-chevron" aria-hidden="true">${ICONS.chevron}</span>
    </button>
  `).join("");

  setCrumb(`Home  ›  ${service.title}`);
  showScreen("detail");
}

function recordFeatureClick(featureId) {
  const service = services[currentServiceKey];
  const feature = service.features.find(item => item.id === featureId);
  if (!feature) return;

  recordBaseClick();

  currentFeatureId = featureId;
  tracking.feature_click_sequence.push(`${currentServiceKey}:${featureId}`);
  clickedFeatures.add(`${currentServiceKey}:${featureId}`);
  tracking.features_clicked_count = clickedFeatures.size;

  showActionDetail(service, feature);
  updateTrackingPreview();
}

function showActionDetail(service, feature) {
  const actionDetail = document.getElementById("action-detail");

  actionDetail.innerHTML = `
    <p class="eyebrow">${service.title}</p>
    <h2>${feature.title}</h2>
    <p>${feature.description}</p>

    <div class="info-grid">
      <div class="info-box"><strong>User value</strong><span>${feature.userValue}</span></div>
      <div class="info-box"><strong>Data required</strong><span>${feature.requiredData}</span></div>
    </div>

    <h3 class="section-title">Try a micro-action</h3>
    <div class="micro-action-list">
      ${feature.actions.map((action, idx) => `
        <div class="micro-action-item">
          <button class="micro-action" data-action-index="${idx}" aria-expanded="false">
            <span>${action.label}</span>
            <span class="micro-action-chevron" aria-hidden="true">${ICONS.chevron}</span>
          </button>
          <div class="micro-action-result-wrap">
            <div class="micro-action-result-inner"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  setCrumb(`Home  ›  ${service.title}  ›  ${feature.title}`);
  showScreen("action");
}

function recordMicroAction(actionLabel, buttonElement, result) {
  recordBaseClick();

  const entry = `${currentServiceKey}:${currentFeatureId}:${actionLabel}`;
  tracking.micro_action_sequence.push(entry);

  const item = buttonElement.closest(".micro-action-item");
  const resultHost = item.querySelector(".micro-action-result-inner");

  if (!item.dataset.rendered) {
    resultHost.innerHTML = renderResult(result);
    item.dataset.rendered = "true";
  }

  const isExpanded = item.classList.toggle("expanded");
  buttonElement.setAttribute("aria-expanded", String(isExpanded));
  buttonElement.classList.toggle("opened", isExpanded);

  updateTrackingPreview();
}

function renderPrivacyScreen() {
  const list = document.getElementById("permission-list");
  list.innerHTML = PERMISSION_ORDER.map(key => {
    const meta = PERMISSION_META[key];
    return `
      <div class="permission-card">
        <div class="permission-main">
          <div>
            <strong>${meta.title}</strong>
            <small>${meta.description}</small>
            <div class="permission-tags">${meta.usedBy.map(s => `<span>${s}</span>`).join("")}</div>
          </div>
        </div>
        <button class="permission-toggle" data-permission="${key}" role="switch" aria-checked="false">Limited</button>
      </div>
    `;
  }).join("");
}

function showPrivacyScreen() {
  recordBaseClick();

  tracking.privacy_info_clicked = true;
  tracking.service_click_sequence.push("data_center");

  setCrumb("Home  ›  Data Center");
  showScreen("privacy");
  updateTrackingPreview();
}

function recordPermissionToggle(permissionName, buttonElement) {
  recordBaseClick();

  tracking.permission_toggles_count += 1;
  tracking.micro_action_sequence.push(`permission:${permissionName}`);

  const nowActive = buttonElement.classList.toggle("active");
  buttonElement.setAttribute("aria-checked", String(nowActive));
  buttonElement.textContent = nowActive ? "Allowed" : "Limited";

  updateTrackingPreview();
}

/* -------------------------------------------------------------------------
   Final tracking payload
   ------------------------------------------------------------------------- */
function getTrackingData() {
  if (mockupStartTime) {
    tracking.total_time_on_mockup_sec = Number(((Date.now() - mockupStartTime) / 1000).toFixed(2));
  }

  return {
    treatment_condition: tracking.treatment_condition,
    mockup_start_time_iso: tracking.mockup_start_time_iso,
    first_click_service: tracking.first_click_service,
    time_to_first_click_sec: tracking.time_to_first_click_sec,
    service_click_sequence: tracking.service_click_sequence.join(" > "),
    feature_click_sequence: tracking.feature_click_sequence.join(" > "),
    micro_action_sequence: tracking.micro_action_sequence.join(" > "),
    total_clicks: tracking.total_clicks,
    services_clicked_count: tracking.services_clicked_count,
    features_clicked_count: tracking.features_clicked_count,
    total_time_on_mockup_sec: tracking.total_time_on_mockup_sec,
    privacy_info_clicked: tracking.privacy_info_clicked,
    permission_toggles_count: tracking.permission_toggles_count,
    banking_clicked: tracking.banking_clicked,
    shopping_clicked: tracking.shopping_clicked,
    delivery_clicked: tracking.delivery_clicked,
    mobility_clicked: tracking.mobility_clicked,
    public_services_clicked: tracking.public_services_clicked,
    last_screen: tracking.last_screen,
    onboarding_completed: tracking.onboarding_completed,
    onboarding_time_sec: tracking.onboarding_time_sec
  };
}

function updateTrackingPreview() {
  if (trackingOutput) {
    trackingOutput.textContent = JSON.stringify(getTrackingData(), null, 2);
  }
}

/* -------------------------------------------------------------------------
   6b. QUALTRICS HANDOFF
   DailyHub always opens in its OWN browser tab (the Qualtrics link uses
   target="_blank"), so the respondent's Qualtrics tab is never navigated
   away from and never reloaded. That matters because two things were
   verified empirically against the live survey and both rule out any
   handoff mechanism that reloads or re-visits the Qualtrics URL:
     1. The respondent-facing Qualtrics renderer strips <iframe> tags on
        this account, and there is no Question JavaScript feature
        available on this (free) Qualtrics license to inject one via the
        DOM, or to listen for window.postMessage from a child tab/frame.
     2. A same-tab redirect back to the Anonymous Link — the previous
        design used here — does NOT resume the in-progress response.
        Every full navigation/reload of the bare survey URL starts a
        brand-new response at the Consent question, even with "Allow
        respondents to finish later" turned on and with zero query
        parameters involved. Confirmed by direct testing: revisiting the
        exact same URL after answering Consent showed a completely blank
        Consent page again, and the Data Table logged a separate, mostly
        empty response for it.

   With reload-based and JS-based handoffs both unavailable, the only
   remaining zero-JS, zero-iframe, zero-reload mechanism is: keep the
   Qualtrics tab open and untouched the whole time, and pass the paradata
   back through the respondent themselves as a short text code they copy
   here and paste into a text-entry question in Qualtrics (still Q9 — no
   new question was added). Survey Flow then reads that answer with
   ordinary piped text (${q://QID9/ChoiceTextEntryValue}) into a single
   embedded data field, `dailyhub_raw_payload`, no different in kind from
   any other question's answer — this is why it survives even though
   nothing about the Qualtrics-side response ever reloads.

   The code is `;`-separated key=value pairs, each value
   encodeURIComponent-escaped so the delimiter can never collide with the
   data. All field names match the Qualtrics-side names the paradata was
   always going to use.
   ------------------------------------------------------------------------- */

/**
 * Builds the short text code the respondent copies out of DailyHub and
 * pastes back into Qualtrics. Same 20 fields the URL-based handoff used
 * to send, just serialized as text instead of query parameters.
 */
function buildHandoffCode(finalData) {
  const fieldMap = {
    dailyhub_reported_condition: finalData.treatment_condition,
    mockup_start_time_iso: finalData.mockup_start_time_iso,
    first_click_service: finalData.first_click_service,
    time_to_first_click_sec: finalData.time_to_first_click_sec,
    service_click_sequence: finalData.service_click_sequence,
    feature_click_sequence: finalData.feature_click_sequence,
    micro_action_sequence: finalData.micro_action_sequence,
    total_clicks: finalData.total_clicks,
    services_clicked_count: finalData.services_clicked_count,
    features_clicked_count: finalData.features_clicked_count,
    total_time_on_mockup_sec: finalData.total_time_on_mockup_sec,
    privacy_info_clicked: finalData.privacy_info_clicked,
    permission_toggles_count: finalData.permission_toggles_count,
    banking_clicked: finalData.banking_clicked,
    shopping_clicked: finalData.shopping_clicked,
    delivery_clicked: finalData.delivery_clicked,
    mobility_clicked: finalData.mobility_clicked,
    public_services_clicked: finalData.public_services_clicked,
    last_screen: finalData.last_screen,
    onboarding_completed: finalData.onboarding_completed,
    onboarding_time_sec: finalData.onboarding_time_sec
  };

  return Object.keys(fieldMap)
    .map(key => {
      let value = fieldMap[key];
      if (value === null || value === undefined) value = "";
      return `${key}=${encodeURIComponent(String(value))}`;
    })
    .join(";");
}

/**
 * Copies text to the clipboard, preferring the async Clipboard API and
 * falling back to a hidden-textarea + execCommand for browsers/contexts
 * (older mobile browsers, non-secure contexts) where that API is
 * unavailable. Always resolves; never throws to the caller.
 */
function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  }
  return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
  try {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(helper);
    return ok;
  } catch (err) {
    return false;
  }
}

/* -------------------------------------------------------------------------
   7. ONBOARDING CONTROLLER
   Identical copy for both conditions, no mention of privacy / convenience /
   value / time / risk. Onboarding clicks are intentionally NOT passed to
   recordBaseClick(), so they never touch total_clicks or any click
   sequence used for the main experimental measures.
   ------------------------------------------------------------------------- */
let onboardingIndex = 0;
let onboardingStartTime = Date.now();
let onboardingSteps, onboardingDots, onboardingNextBtn;

function updateOnboardingUI() {
  onboardingSteps.forEach((el, i) => el.classList.toggle("hidden", i !== onboardingIndex));
  onboardingDots.forEach((el, i) => el.classList.toggle("active", i === onboardingIndex));
  onboardingNextBtn.textContent = onboardingIndex === onboardingSteps.length - 1 ? "Get started" : "Next";
}

function completeOnboarding() {
  tracking.onboarding_completed = true;
  tracking.onboarding_time_sec = Number(((Date.now() - onboardingStartTime) / 1000).toFixed(2));

  document.getElementById("onboarding").classList.add("hidden");
  document.getElementById("main-app").classList.remove("hidden");

  mockupStartTime = Date.now();
  tracking.mockup_start_time_iso = new Date().toISOString();

  showScreen("home");
  updateTrackingPreview();
}

function setupOnboarding() {
  onboardingSteps = document.querySelectorAll(".onboarding-step");
  onboardingDots = document.querySelectorAll(".onboarding-progress .dot");
  onboardingNextBtn = document.getElementById("onboarding-next");

  updateOnboardingUI();

  onboardingNextBtn.addEventListener("click", () => {
    if (onboardingIndex < onboardingSteps.length - 1) {
      onboardingIndex += 1;
      updateOnboardingUI();
    } else {
      completeOnboarding();
    }
  });
}

/* -------------------------------------------------------------------------
   Debug mode — ?debug=1 shows the Tracking Preview panel. Anything else
   (including the normal published URL) hides it completely.
   ------------------------------------------------------------------------- */
function setupDebugMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") === "1") {
    document.body.classList.add("debug-mode");
  }
}

/* -------------------------------------------------------------------------
   8. INITIALIZATION + EVENT WIRING
   ------------------------------------------------------------------------- */
function initializeMockup() {
  cacheDom();

  const conditionKey = resolveCondition();
  treatment = conditionKey === "convenience_value" ? treatmentOptions.convenience : treatmentOptions.privacy;
  tracking.treatment_condition = treatment.condition;

  document.getElementById("treatment-chip-icon").innerHTML = ICONS[treatment.icon];
  document.getElementById("treatment-chip-text").textContent = treatment.chip;
  document.getElementById("framing-title").textContent = treatment.title;
  document.getElementById("framing-text").textContent = treatment.text;

  renderServiceGrid();
  renderPrivacyScreen();
  setupDebugMode();
  setupOnboarding();
  updateTrackingPreview();

  wireEvents();
}

function wireEvents() {
  document.getElementById("service-grid").addEventListener("click", event => {
    const card = event.target.closest("[data-service]");
    if (!card) return;
    recordServiceClick(card.dataset.service);
  });

  document.getElementById("feature-grid").addEventListener("click", event => {
    const featureButton = event.target.closest("[data-feature]");
    if (!featureButton) return;
    recordFeatureClick(featureButton.dataset.feature);
  });

  document.getElementById("action-detail").addEventListener("click", event => {
    const actionButton = event.target.closest(".micro-action");
    if (!actionButton) return;
    const idx = Number(actionButton.dataset.actionIndex);
    const feature = services[currentServiceKey].features.find(f => f.id === currentFeatureId);
    const action = feature.actions[idx];
    recordMicroAction(action.label, actionButton, action.result);
  });

  document.getElementById("permission-list").addEventListener("click", event => {
    const permissionButton = event.target.closest("[data-permission]");
    if (!permissionButton) return;
    recordPermissionToggle(permissionButton.dataset.permission, permissionButton);
  });

  document.getElementById("detail-back-button").addEventListener("click", () => {
    recordBaseClick();
    setCrumb(null);
    showScreen("home");
  });

  document.getElementById("action-back-button").addEventListener("click", () => {
    recordBaseClick();
    showServiceDetail(currentServiceKey);
  });

  document.getElementById("privacy-back-button").addEventListener("click", () => {
    recordBaseClick();
    setCrumb(null);
    showScreen("home");
  });

  document.getElementById("data-center-button").addEventListener("click", showPrivacyScreen);

  document.getElementById("finish-button").addEventListener("click", () => {
    recordBaseClick();

    const finalData = getTrackingData();
    window.dailyHubFinalData = finalData;
    document.dispatchEvent(new CustomEvent("dailyhub:complete", { detail: finalData }));

    setCrumb(null);
    showScreen("completed");
    document.getElementById("app-footer").classList.add("hidden");

    // Hand the paradata back to Qualtrics via a copy-paste code (see
    // section 6b above) instead of a redirect: DailyHub runs in its own
    // tab, so the Qualtrics tab is never touched.
    const code = buildHandoffCode(finalData);
    const codeBox = document.getElementById("handoff-code");
    const copyButton = document.getElementById("copy-code-button");
    const copyConfirmation = document.getElementById("copy-confirmation");
    const closeButton = document.getElementById("close-tab-button");

    if (codeBox) {
      codeBox.value = code;
    }

    if (copyButton) {
      copyButton.addEventListener("click", () => {
        copyTextToClipboard(code).then(() => {
          if (copyConfirmation) copyConfirmation.classList.remove("hidden");
          if (codeBox) {
            codeBox.focus();
            codeBox.select();
          }
        });
      });
    }

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        window.close();
      });
    }
  });
}

initializeMockup();