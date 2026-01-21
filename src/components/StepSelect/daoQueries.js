import { gql } from '@urql/preact'

export const DAO_VSC_ID = 'vsc1Ba9AyyUcMnYVoDVsjoJztnPFHNxQwWBPsb'
export const DAO_JOIN_FN = 'project_join'

export const DAO_USER_QUERY = gql`
  query DaoUserLists($user: String!) {
    projects: okinoko_dao_project_created_events(order_by: { project_id: asc }) {
      project_id
      name
      description
      created_by
      funds_asset
      url
      voting_system
      threshold_percent
      quorum_percent
      proposal_duration_hours
      execution_delay_hours
      leave_cooldown_hours
      proposal_cost
      stake_min_amount
      proposals_members_only
    }
    memberships: okinoko_dao_membership_latest(where: { member: { _eq: $user } }) {
      project_id
      active
      last_action
    }
    allMembers: okinoko_dao_membership_latest {
      project_id
      member
      active
    }
    daoProposals: okinoko_dao_proposal_overview(order_by: { proposal_id: desc }) {
      proposal_id
      project_id
      name
      description
      metadata
      options
      payouts
      outcome_meta
      duration_hours
      state
      result
      ready_at
      ready_block
      state_block
      created_by
      member
      member_active
      is_poll
      active_members
      members
    }
    daoVotes: okinoko_dao_votes_view {
      proposal_id
      voter
      weight
      choices
    }
    stakeBalances: okinoko_dao_stake_balances {
      project_id
      account
      stake_amount
      asset
    }
    treasury: okinoko_dao_treasury_movements {
      project_id
      direction
      amount
      asset
    }
  }
`
