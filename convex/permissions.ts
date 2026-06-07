/**
 * Central role + permission definitions for Sabi.
 *
 * Permissions are enforced SERVER-SIDE in every query/mutation via
 * requirePermission() in auth.ts. The UI also reads these to show/hide
 * features, but hiding UI is never the security boundary — the server check is.
 */

export type Permission =
  // Financials
  | "view_revenue" // see total revenue / profit / financial dashboard
  | "view_expenses"
  | "log_revenue"
  | "log_expense"
  | "edit_transaction"
  | "delete_transaction"
  // Inventory
  | "view_inventory"
  | "edit_inventory"
  // Customers
  | "view_customers"
  | "edit_customers"
  | "record_payment"
  | "view_neighbors"
  | "manage_neighbors"
  // AI
  | "use_assistant"
  | "generate_adverts"
  // Receipts
  | "upload_receipts"
  | "confirm_receipts"
  // Team / business management
  | "invite_members"
  | "remove_members"
  | "edit_business"
  | "delete_business"
  | "manage_billing";

export type Role =
  | "owner"
  | "manager"
  | "accountant"
  | "sales_rep"
  | "marketer"
  | "inventory_clerk"
  | "viewer";

const ALL: Permission[] = [
  "view_revenue",
  "view_expenses",
  "log_revenue",
  "log_expense",
  "edit_transaction",
  "delete_transaction",
  "view_inventory",
  "edit_inventory",
  "view_customers",
  "edit_customers",
  "record_payment",
  "view_neighbors",
  "manage_neighbors",
  "use_assistant",
  "generate_adverts",
  "upload_receipts",
  "confirm_receipts",
  "invite_members",
  "remove_members",
  "edit_business",
  "delete_business",
  "manage_billing",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,

  manager: [
    "view_revenue",
    "view_expenses",
    "log_revenue",
    "log_expense",
    "edit_transaction",
    "delete_transaction",
    "view_inventory",
    "edit_inventory",
    "view_customers",
    "edit_customers",
    "record_payment",
    "view_neighbors",
    "manage_neighbors",
    "use_assistant",
    "generate_adverts",
    "upload_receipts",
    "confirm_receipts",
    "invite_members",
    "edit_business",
  ],

  accountant: [
    "view_revenue",
    "view_expenses",
    "log_revenue",
    "log_expense",
    "edit_transaction",
    "delete_transaction",
    "view_customers",
    "record_payment",
    "view_neighbors",
    "manage_neighbors",
    "use_assistant",
    "upload_receipts",
    "confirm_receipts",
    "view_inventory", // read-only inventory to value stock; no edit_inventory
  ],

  sales_rep: [
    "log_revenue", // can log their own sales
    "view_inventory", // needs to see stock to sell
    "view_customers",
    "edit_customers", // can add new customers
    "record_payment", // can take customer payments
    "view_neighbors",
    "manage_neighbors", // can record borrowing a neighbor's goods during a sale
    "upload_receipts", // can snap a sale receipt
    // NOTE: deliberately NO view_revenue / view_expenses — cannot see business totals
  ],

  marketer: [
    "view_inventory", // needs to know what's in stock to promote
    "generate_adverts",
    "use_assistant",
    // NOTE: deliberately NO money permissions at all
  ],

  inventory_clerk: [
    "view_inventory",
    "edit_inventory",
    "upload_receipts", // can snap a supplier delivery note
    // NOTE: no financials, no customers
  ],

  viewer: [
    "view_revenue",
    "view_expenses",
    "view_inventory",
    "view_customers",
    "view_neighbors",
    // read-only: no log/edit/delete anything
  ],
};

export function roleHasPermission(role: string, perm: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(perm);
}

/**
 * Human-friendly descriptions shown to owners when assigning roles.
 */
export const ROLE_INFO: Record<
  Role,
  { label: string; tagline: string; canDo: string[]; cannotDo: string[] }
> = {
  owner: {
    label: "Owner",
    tagline: "Full control. This is you.",
    canDo: [
      "Everything — sales, expenses, inventory, customers",
      "Invite and remove team members",
      "Manage billing and subscription",
      "Edit or delete the business",
    ],
    cannotDo: [],
  },
  manager: {
    label: "Manager",
    tagline: "Runs the business day-to-day. Trusted #2.",
    canDo: [
      "See all financials (revenue, profit, expenses)",
      "Log and edit transactions",
      "Manage inventory and customers",
      "Use the AI assistant and generate adverts",
      "Invite staff (except other managers)",
    ],
    cannotDo: ["Manage billing", "Delete the business"],
  },
  accountant: {
    label: "Accountant",
    tagline: "Handles the money. Sees the full financial picture.",
    canDo: [
      "See all revenue, profit, and expenses",
      "Log and edit transactions",
      "Record customer debt payments",
      "Upload and confirm receipts",
      "View inventory value (read-only)",
    ],
    cannotDo: [
      "Edit inventory stock",
      "Invite or remove team members",
      "Manage billing",
    ],
  },
  sales_rep: {
    label: "Sales Rep",
    tagline: "Sells and serves customers on the floor.",
    canDo: [
      "Log their own sales",
      "Add and manage customers",
      "Record customer payments",
      "See what's in stock to sell",
    ],
    cannotDo: [
      "See total revenue, profit, or expenses",
      "Edit inventory or prices",
      "See the business's overall money figures",
    ],
  },
  marketer: {
    label: "Marketer",
    tagline: "Promotes the business. Never sees the money.",
    canDo: [
      "See what products are in stock to promote",
      "Generate adverts for WhatsApp, Instagram, etc.",
      "Use the AI assistant for marketing ideas",
    ],
    cannotDo: [
      "See ANY money — no revenue, profit, expenses, or debt",
      "Log transactions",
      "Edit inventory or customers",
    ],
  },
  inventory_clerk: {
    label: "Inventory Clerk",
    tagline: "Manages stock. Nothing financial.",
    canDo: [
      "Add and edit inventory items",
      "Adjust stock quantities",
      "Upload supplier delivery notes",
    ],
    cannotDo: [
      "See any financials",
      "See customers",
      "Log sales or expenses",
    ],
  },
  viewer: {
    label: "Viewer",
    tagline: "Read-only access. Good for accountants' assistants or investors.",
    canDo: [
      "View the dashboard, financials, inventory, and customers",
    ],
    cannotDo: ["Edit or change anything at all"],
  },
};

export const ASSIGNABLE_ROLES: Role[] = [
  "manager",
  "accountant",
  "sales_rep",
  "marketer",
  "inventory_clerk",
  "viewer",
];
