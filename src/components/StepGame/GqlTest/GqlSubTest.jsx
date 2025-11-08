import { useSubscription } from "urql";

const GAME_SUB = `
  subscription {
    okinoko_iarv2_joined_events {
      id
      by
    }
  }
`;

const handleNewJoin = (prev, data) => {
  console.log("New join event:", data);
  return data;
};

const [res] = useSubscription({ query: GAME_SUB }, handleNewJoin);
