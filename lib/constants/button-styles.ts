/**
 * Standardized button styles for action buttons across the application
 * These ensure consistent visual language for different action types
 */

export const ACTION_BUTTON_STYLES = {
  /**
   * Blue - View/Details/Info actions
   * Use for: View, Details, View Transactions, etc.
   */
  view: "text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200",
  
  /**
   * Blue - Edit actions
   * Use for: Edit, Modify, Update (non-primary)
   */
  edit: "text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200",
  
  /**
   * Red - Delete/Danger actions
   * Use for: Delete, Remove, Revoke (permanent)
   */
  delete: "text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200",
  
  /**
   * Red - Generic danger actions
   * Use for: Any destructive action
   */
  danger: "text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200",
  
  /**
   * Amber/Yellow - Warning/Caution actions
   * Use for: Suspend, Restore, Warning operations
   */
  warning: "text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200",
  
  /**
   * Green - Success/Positive actions
   * Use for: Activate, Reactivate, Approve, Enable
   */
  success: "text-green-700 bg-green-50 hover:bg-green-100 hover:text-green-800 border-green-200",
  
  /**
   * Orange (FDH Brand) - Primary actions
   * Use for: Create, Add, Generate (main CTAs)
   */
  primary: "bg-fdh-orange hover:bg-fdh-orange/90",
} as const;

/**
 * Get the appropriate button style based on action type
 * @param action - The type of action
 * @returns The corresponding button class names
 */
export function getActionButtonStyle(action: keyof typeof ACTION_BUTTON_STYLES): string {
  return ACTION_BUTTON_STYLES[action];
}
