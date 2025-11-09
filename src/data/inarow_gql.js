import { gql } from '@urql/preact';

export const LOBBY_QUERY = gql`
  query LobbyGames($gameType: numeric!) {
    okinoko_iarv2_waiting_for_join(where: { type: { _eq: $gameType } }) {
      id
      name
      creator
      betamount
      betasset
      fmcosts
      type
      created_block
      # placeholder field to touch config so watcher reloads
    }
  }
`;

export const ACTIVE_GAMES_FOR_PLAYER_QUERY = gql`
  query ActiveGamesForPlayer($user: String!, $gameType: numeric!) {
    okinoko_iarv2_active_with_turn(
      where: {
        type: { _eq: $gameType }
        _or: [{ creator: { _eq: $user } }, { joiner: { _eq: $user } }]
      }
    ) {
      id
      type
      creator
      joiner
      x_player
      o_player
      last_move_by
      next_turn_player
      betamount
      betasset
      fmc
      name
    }
  }
`;

export const GAME_MOVES_QUERY = gql`
  query GameMoves($gameId: numeric!) {
    moves: okinoko_iarv2_move_events(
      where: { id: { _eq: $gameId } }
      order_by: { indexer_block_height: asc }
    ) {
      id
      by
      cell
      indexer_block_height
    }
    joins: okinoko_iarv2_joined_events(
      where: { id: { _eq: $gameId } }
      order_by: { indexer_block_height: desc }
      limit: 1
    ) {
      id
      by
      fmp
      indexer_block_height
    }
    swaps: okinoko_iarv2_swap_events(
      where: { id: { _eq: $gameId } }
      order_by: { indexer_block_height: asc }
    ) {
      id
      by
      operation
      choice
      color
      indexer_block_height
    }
  }
`;

export const GAME_MOVE_SUBSCRIPTION = gql`
  subscription OnGameMove($gameId: numeric!) {
    okinoko_iarv2_move_events_stream(
      batch_size: 1
      cursor: { initial_value: { indexer_block_height: 0 }, ordering: ASC }
      where: { id: { _eq: $gameId } }
    ) {
      id
      indexer_block_height
    }
  }
`;

export const IAR_EVENTS_SUBSCRIPTION = gql`
  subscription OnIarEvent {
    okinoko_iarv2_all_events {
      event_type
      id
      indexer_block_height
    }
  }
`;

export const GAME_EVENTS_SUBSCRIPTION = gql`
  subscription OnGameEvent($gameId: numeric!) {
    okinoko_iarv2_all_events(where: { id: { _eq: $gameId } }) {
      event_type
      id
      indexer_block_height
    }
  }
`;
