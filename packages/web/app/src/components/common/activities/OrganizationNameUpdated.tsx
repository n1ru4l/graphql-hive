import React from 'react';
import { VscEdit } from 'react-icons/vsc';
import { OrganizationNameUpdatedActivity } from '../../../graphql';
import { Activity, User, Highlight } from './common';
import { TimeAgo } from '../index';

export const OrganizationNameUpdated: React.FC<{
  activity: OrganizationNameUpdatedActivity;
}> = ({ activity }) => {
  return (
    <Activity.Root>
      <Activity.Icon>
        <VscEdit />
      </Activity.Icon>
      <Activity.Content>
        <Activity.Text>
          <User user={activity.user} /> changed organization name to{' '}
          <Highlight>{activity.value}</Highlight>
        </Activity.Text>
        <Activity.Time>
          <TimeAgo date={activity.createdAt} />
        </Activity.Time>
      </Activity.Content>
    </Activity.Root>
  );
};