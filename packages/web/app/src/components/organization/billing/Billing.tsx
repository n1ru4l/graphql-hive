import React from 'react';
import {
  BillingPlansDocument,
  OrganizationFieldsFragment,
  OrgBillingInfoFieldsFragment,
} from '@/graphql';
import 'twin.macro';
import { PlanSummary } from './PlanSummary';
import { useQuery } from 'urql';
import { DataWrapper } from '@/components/common/DataWrapper';

export const BillingView: React.FC<{
  organization: OrganizationFieldsFragment & OrgBillingInfoFieldsFragment;
}> = ({ organization, children }) => {
  const [query] = useQuery({
    query: BillingPlansDocument,
  });

  return (
    <DataWrapper query={query}>
      {(result) => {
        const plan = result.data.billingPlans.find(
          (v) => v.planType === organization.plan
        );

        return (
          <PlanSummary
            operationsRateLimit={Math.floor(
              organization.rateLimit.operations / 1_000_000
            )}
            schemaPushesRateLimit={organization.rateLimit.schemaPushes}
            plan={plan}
          >
            {children}
          </PlanSummary>
        );
      }}
    </DataWrapper>
  );
};