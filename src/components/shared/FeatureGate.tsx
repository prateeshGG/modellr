import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  children: React.ReactNode;
  feature: string;
  fallback?: React.ReactNode;
  proOnly?: boolean;
}

/**
 * FeatureGate
 * Logic for gating features based on user tier.
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  children, 
  proOnly = true, 
  fallback 
}) => {
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const isPro = profile?.tier === 'pro';

  if (proOnly && !isPro) {
    if (fallback) return <>{fallback}</>;
    
    // Default Pro-gate UI if no fallback provided
    return (
      <div className="pro-gate-overlay">
        <div className="pro-gate-content">
          <span className="pro-badge-mini">PRO FEATURE</span>
          <h3>Upgrade to Unlock</h3>
          <p>This feature is only available on the Pro plan.</p>
          <button onClick={() => navigate('/pricing')} className="btn-primary btn-sm">
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Utility to check feature access outside of React components
 */
export const hasFeatureAccess = (tier: string | undefined, feature: string) => {
  const isPro = tier === 'pro';
  
  const proFeatures = [
    'export_prisma',
    'export_drizzle',
    'live_introspection',
    'ai_chat_modify',
    'unlimited_schemas'
  ];

  if (proFeatures.includes(feature)) {
    return isPro;
  }

  return true;
};
