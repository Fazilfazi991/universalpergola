export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const INITIAL_ACTION_STATE: ActionState = { status: "idle" };
