import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { Permission, roleHasPermission } from "./permissions";

/**
 * Get the currently signed-in user's row (or null).
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
}

export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user;
}

/**
 * Return the caller's membership for a business, or null if they have none.
 */
export async function getMembership(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">
) {
  const user = await getCurrentUser(ctx);
  if (!user) return null;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_business", (q) =>
      q.eq("userId", user._id).eq("businessId", businessId)
    )
    .first();
  return membership ? { user, membership } : null;
}

/**
 * Require that the caller is a member of the business (any role).
 * Returns { user, membership, business }.
 */
export async function requireMember(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">
) {
  const user = await requireUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_business", (q) =>
      q.eq("userId", user._id).eq("businessId", businessId)
    )
    .first();
  if (!membership || membership.status !== "active") {
    throw new Error("You don't have access to this business");
  }
  const business = await ctx.db.get(businessId);
  if (!business) throw new Error("Business not found");
  return { user, membership, business };
}

/**
 * Require that the caller has a specific permission on the business.
 * This is the core security check — used in every sensitive function.
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">,
  permission: Permission
) {
  const { user, membership, business } = await requireMember(ctx, businessId);
  if (!roleHasPermission(membership.role, permission)) {
    throw new Error(
      `Your role (${membership.role}) does not allow this action (${permission})`
    );
  }
  return { user, membership, business };
}

/**
 * Convenience: is the caller the owner of this business?
 */
export async function requireOwner(
  ctx: QueryCtx | MutationCtx,
  businessId: Id<"businesses">
) {
  const { user, membership, business } = await requireMember(ctx, businessId);
  if (membership.role !== "owner") {
    throw new Error("Only the business owner can do this");
  }
  return { user, membership, business };
}
