export type RegistrationPolicy = { allowSignUp: boolean; requireApproval: boolean };
export const defaultRegistrationPolicy: RegistrationPolicy = { allowSignUp: true, requireApproval: false };
