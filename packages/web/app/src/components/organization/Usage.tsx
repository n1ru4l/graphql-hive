import React from 'react';
import {
  OrganizationFieldsFragment,
  OrgBillingInfoFieldsFragment,
  UsageEstimationDocument,
} from '@/graphql';
import { useQuery } from 'urql';
import { Scale } from '../common';
import { DataWrapper } from '../common/DataWrapper';
import 'twin.macro';
import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { calculatePeriod } from '../common/TimeFilter';

export const OrganizationUsageEstimationView: React.FC<{
  organization: OrganizationFieldsFragment & OrgBillingInfoFieldsFragment;
}> = ({ organization }) => {
  const period = calculatePeriod('month');

  const [query] = useQuery({
    query: UsageEstimationDocument,
    variables: {
      organization: organization.cleanId,
      range: period,
    },
  });

  return (
    <>
      <div tw="top-7 right-4">
        <DataWrapper query={query}>
          {(result) => (
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Feature</Th>
                    <Th isNumeric>Used</Th>
                    <Th isNumeric>Limit</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>Operations</Td>
                    <Td isNumeric>
                      {result.data.usageEstimation.org.operations}
                    </Td>
                    <Td isNumeric>{organization.rateLimit.operations}</Td>
                    <Td isNumeric>
                      <Scale
                        value={result.data.usageEstimation.org.operations}
                        size={10}
                        max={organization.rateLimit.operations}
                        tw="justify-end"
                      />
                    </Td>
                  </Tr>
                  <Tr>
                    <Td>Schema Pushes</Td>
                    <Td isNumeric>
                      {result.data.usageEstimation.org.schemaPushes}
                    </Td>
                    <Td isNumeric>{organization.rateLimit.schemaPushes}</Td>
                    <Td isNumeric>
                      <Scale
                        value={result.data.usageEstimation.org.schemaPushes}
                        size={10}
                        max={organization.rateLimit.schemaPushes}
                        tw="justify-end"
                      />
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </DataWrapper>
      </div>
    </>
  );
};