import { readLocalAccountConfig } from '../../lib/readLocalAccountConfig';

export function AccountOnboardingGate({ children }) {
  const config = readLocalAccountConfig();

  if (!config || !config.valid) {
    return <div>Onboarding required: Please configure your account.</div>;
  }

  return <>{children}</>;
}
